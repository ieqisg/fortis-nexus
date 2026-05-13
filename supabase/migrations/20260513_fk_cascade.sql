-- matches: cascade on both parent deletes
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_mentee_group_id_fkey,
  ADD CONSTRAINT matches_mentee_group_id_fkey
    FOREIGN KEY (mentee_group_id) REFERENCES "MENTEE_GROUPS"(id) ON DELETE CASCADE;

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_mentor_id_fkey,
  ADD CONSTRAINT matches_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES mentor(id) ON DELETE CASCADE;

-- meetings: cascade on both parent deletes
ALTER TABLE meetings
  DROP CONSTRAINT IF EXISTS meetings_mentee_group_id_fkey,
  ADD CONSTRAINT meetings_mentee_group_id_fkey
    FOREIGN KEY (mentee_group_id) REFERENCES "MENTEE_GROUPS"(id) ON DELETE CASCADE;

ALTER TABLE meetings
  DROP CONSTRAINT IF EXISTS meetings_mentor_id_fkey,
  ADD CONSTRAINT meetings_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES mentor(id) ON DELETE CASCADE;

-- papers: cascade on both parent deletes
ALTER TABLE papers
  DROP CONSTRAINT IF EXISTS papers_mentee_group_id_fkey,
  ADD CONSTRAINT papers_mentee_group_id_fkey
    FOREIGN KEY (mentee_group_id) REFERENCES "MENTEE_GROUPS"(id) ON DELETE CASCADE;

ALTER TABLE papers
  DROP CONSTRAINT IF EXISTS papers_mentor_id_fkey,
  ADD CONSTRAINT papers_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES mentor(id) ON DELETE CASCADE;

-- paper_comments: cascade when parent paper or mentor is deleted
ALTER TABLE paper_comments
  DROP CONSTRAINT IF EXISTS paper_comments_paper_id_fkey,
  ADD CONSTRAINT paper_comments_paper_id_fkey
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE;

ALTER TABLE paper_comments
  DROP CONSTRAINT IF EXISTS paper_comments_mentor_id_fkey,
  ADD CONSTRAINT paper_comments_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES mentor(id) ON DELETE CASCADE;
