/*
  Replace the outdated SoundCloud avatar for د. أحمد عبد المنعم with his
  verified public profile photo (@A_Abdelmonem82, linked from إنه القرآن).
  Idempotent: safe to run more than once in Supabase SQL Editor.
*/

BEGIN;

UPDATE hosts
SET photo_url = 'https://unavatar.io/x/A_Abdelmonem82'
WHERE id = '05e7036b-03df-54a2-9223-166bffd1fe16'::uuid
  AND photo_url IS DISTINCT FROM 'https://unavatar.io/x/A_Abdelmonem82';

UPDATE hosts
SET photo_url = 'https://unavatar.io/x/A_Abdelmonem82'
WHERE slug = 'ahmed-abdelmoneim'
  AND photo_url IS DISTINCT FROM 'https://unavatar.io/x/A_Abdelmonem82';

COMMIT;
