import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from transformers import AutoTokenizer, AutoModel
import torch

# ─────────────────────────────────────────────
# 1. TEXT CLEANING
# ─────────────────────────────────────────────

def clean_text(text: str) -> str:
    if not text:
        return ""
    # lowercase
    text = text.lower()
    # remove special characters but keep spaces
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # remove extra whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def build_mentor_text(mentor: dict) -> str:
    skills = " ".join(mentor.get("technical_skills") or [])
    forte = " ".join(mentor.get("forte") or [])
    description = mentor.get("self_description") or ""
    return f"{skills} {forte} {description}"

def build_mentee_text(mentee: dict) -> str:
    title = mentee.get("research_title") or ""
    description = mentee.get("research_description") or ""
    preference = mentee.get("mentor_preference") or ""
    return f"{title} {description} {preference}"

# ─────────────────────────────────────────────
# 2. TF-IDF KEYWORD EXTRACTION
# ─────────────────────────────────────────────

def extract_tfidf_keywords(texts: list[str], top_n: int = 10):
    cleaned = [clean_text(t) for t in texts]
    
    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=200,
        ngram_range=(1, 2)  # unigrams and bigrams e.g. "machine learning"
    )
    tfidf_matrix = vectorizer.fit_transform(cleaned)
    feature_names = vectorizer.get_feature_names_out()

    keywords_per_doc = []
    for row in tfidf_matrix:
        scores = zip(feature_names, row.toarray()[0])
        sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)
        keywords = [word for word, score in sorted_scores if score > 0][:top_n]
        keywords_per_doc.append(keywords)

    return keywords_per_doc, vectorizer, tfidf_matrix

# ─────────────────────────────────────────────
# 3. BERT EMBEDDINGS
# ─────────────────────────────────────────────

# use a lightweight BERT model suited for sentence similarity
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def load_bert_model():
    print("🤖 Loading BERT model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModel.from_pretrained(MODEL_NAME)
    model.eval()
    print("✅ BERT model loaded")
    return tokenizer, model

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def get_bert_embeddings_batched(
    texts: list[str],
    tokenizer,
    model,
    batch_size: int = 32  # process 32 at a time instead of all at once
) -> np.ndarray:
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        cleaned = [clean_text(t) for t in batch]
        
        encoded = tokenizer(
            cleaned,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        )

        with torch.no_grad():
            output = model(**encoded)

        embeddings = mean_pooling(output, encoded["attention_mask"])
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        all_embeddings.append(embeddings.numpy())
        
        print(f"  Processed {min(i + batch_size, len(texts))}/{len(texts)} texts")

    return np.vstack(all_embeddings)

# ─────────────────────────────────────────────
# 4. COMBINED REPRESENTATION
# ─────────────────────────────────────────────

def get_combined_embeddings(
    texts: list[str],
    tokenizer,
    model,
    tfidf_weight: float = 0.3,
    bert_weight: float = 0.7
) -> np.ndarray:
    cleaned = [clean_text(t) for t in texts]

    # TF-IDF vectors
    vectorizer = TfidfVectorizer(stop_words="english", max_features=200, ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(cleaned).toarray()

    # normalize TF-IDF
    tfidf_norms = np.linalg.norm(tfidf_matrix, axis=1, keepdims=True)
    tfidf_normalized = np.divide(tfidf_matrix, tfidf_norms, where=tfidf_norms != 0)

    # BERT embeddings
    bert_embeddings = get_bert_embeddings(texts, tokenizer, model)

    # pad TF-IDF to same dim as BERT if needed (BERT is 384 dims for MiniLM)
    # we keep them separate and concatenate with weights
    tfidf_weighted = tfidf_weight * tfidf_normalized
    bert_weighted = bert_weight * bert_embeddings

    # since dimensions differ, return separately for scoring
    return tfidf_weighted, bert_weighted, vectorizer

# ─────────────────────────────────────────────
# TEST
# ─────────────────────────────────────────────

if __name__ == "__main__":
    sample_mentors = [
        {
            "technical_skills": ["Python", "Machine Learning", "NLP"],
            "forte": ["AI Research", "Deep Learning"],
            "self_description": "I specialize in natural language processing and computer vision."
        }
    ]
    sample_mentees = [
        {
            "research_title": "AI-Powered Mentor Matching System",
            "research_description": "Using NLP and machine learning to match students with mentors based on research interests.",
            "mentor_preference": "Looking for a mentor with expertise in AI and NLP."
        }
    ]

    mentor_texts = [build_mentor_text(m) for m in sample_mentors]
    mentee_texts = [build_mentee_text(m) for m in sample_mentees]

    print("📝 Mentor text:", mentor_texts[0])
    print("📝 Mentee text:", mentee_texts[0])

    print("\n🔍 Extracting TF-IDF keywords...")
    all_texts = mentor_texts + mentee_texts
    keywords, _, _ = extract_tfidf_keywords(all_texts)
    print("Mentor keywords:", keywords[0])
    print("Mentee keywords:", keywords[1])

    print("\n🤖 Getting BERT embeddings...")
    tokenizer, model = load_bert_model()
    bert_embeddings = get_bert_embeddings(all_texts, tokenizer, model)
    print(f"Embedding shape: {bert_embeddings.shape}")
    print("✅ Text processing complete")
