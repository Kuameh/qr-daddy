-- Saved codes keep their logo, so a download from Your codes matches what was printed.
--
-- logo is a data URL (data:image/png|jpeg|webp;base64,...), at most 200,000 characters; the
-- browser saves a copy shrunk to 512 px. NULL means no logo. createCode/updateCode
-- check it (validateLogo); listCodes never selects it, only whether there is one.

ALTER TABLE codes ADD COLUMN logo TEXT;
