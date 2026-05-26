-- Add FLEXIBLE back as a valid communication_preference value.
-- FLEXIBLE is inferred when a user selects days from both the face-to-face
-- group (Mon/Wed/Thu/Sat) AND the online group (Tue/Fri).

ALTER TABLE mentor
    DROP CONSTRAINT IF EXISTS mentor_communication_preference_check;

ALTER TABLE mentor
    ADD CONSTRAINT mentor_communication_preference_check
    CHECK (communication_preference IN ('FACE_TO_FACE', 'ONLINE_MEETING', 'FLEXIBLE'));

ALTER TABLE "MENTEE_GROUPS"
    DROP CONSTRAINT IF EXISTS mentee_groups_communication_preference_check;

ALTER TABLE "MENTEE_GROUPS"
    ADD CONSTRAINT mentee_groups_communication_preference_check
    CHECK (communication_preference IN ('FACE_TO_FACE', 'ONLINE_MEETING', 'FLEXIBLE'));
