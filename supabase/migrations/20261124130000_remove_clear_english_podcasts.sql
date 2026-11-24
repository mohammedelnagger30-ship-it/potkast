/*
  Remove clear-English podcasts/shows and keep mixed Arabic/English content.
  User-confirmed: remove clear English, keep mixed, replace with famous Arabic alternatives.
  Generated: 2026-11-24T00:40:54.760037Z
  Podcasts: 57 | Episodes (catalog snapshot): 7962
  Safety: deletes by explicit podcast IDs only; removes only hosts orphaned by this deletion.
  Review list: D:/Temp/opencode/english-removal-summary.txt
*/

BEGIN;

CREATE TEMP TABLE tmp_remove_english_podcasts(id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO tmp_remove_english_podcasts(id) VALUES
  ('d7842cd0-a5a6-4e59-a2a3-608a8e9221f5'::uuid),
  ('cdae1e97-d3ad-4dc0-befa-18902fdf33c4'::uuid),
  ('9304c48c-a760-4d98-a944-24e920d4ed8c'::uuid),
  ('4cd720a9-e86a-4e0b-be13-99f9c5736170'::uuid),
  ('66acec12-b672-48fb-9c12-42b22d96d18e'::uuid),
  ('15511ec5-247a-4277-93e9-640c3c165d25'::uuid),
  ('976c4864-2a66-4ff5-bacd-218fc3b0021f'::uuid),
  ('ca307f14-47e0-4f88-b65b-068e93b8bd5d'::uuid),
  ('758f9636-198e-4f8d-bedd-50d5bb8dd377'::uuid),
  ('ac9f7393-0d14-4fc7-8687-b718f51c3cf4'::uuid),
  ('e7d27160-9925-4ef7-9338-7d1e9e17951c'::uuid),
  ('3464f729-7359-4edf-b18d-ce95db79bc1a'::uuid),
  ('ab4e3184-5778-48d1-b1c0-e12b8d30bc42'::uuid),
  ('626c413b-9116-4219-88c2-f12e5a6955d0'::uuid),
  ('2d4dcd4e-2737-4c96-928d-4f9bbc2ab894'::uuid),
  ('a2606476-d4e3-4416-8048-72c5905a02a2'::uuid),
  ('72a90618-6160-4fb1-b852-bb511a8ccd89'::uuid),
  ('3b7c146d-afbd-422f-ba96-5f5b83259a88'::uuid),
  ('c03443fd-0edf-4dfb-9052-25dc381253c4'::uuid),
  ('0ca44eca-005f-460d-a546-813bb223b8ac'::uuid),
  ('cb33fc46-8409-4cf5-8cb0-76cb1bfc38bd'::uuid),
  ('8fd21281-af58-4297-a659-06ae33064f83'::uuid),
  ('59dda4ee-aa11-4f61-859b-4835f50d6b94'::uuid),
  ('f0504db5-dc7c-4d22-a368-8bc9bf81876c'::uuid),
  ('08f51d1a-9b02-46a1-bab1-08026db06232'::uuid),
  ('15b99e67-a4b6-4c6c-a0bc-a26937484f13'::uuid),
  ('3d6243bb-d095-4c07-8362-d81f30e51eeb'::uuid),
  ('bb4e5d17-eca2-4b97-8efa-f81cdda2d526'::uuid),
  ('b12934a6-3a7e-4cd7-a98a-781dd23de042'::uuid),
  ('baf20630-e50f-46d8-bf39-6c7c32f38898'::uuid),
  ('b85a044c-c2b3-4f1b-83ce-0e5c2633eda2'::uuid),
  ('36f898a0-35d0-4581-9e98-3c1262ecb714'::uuid),
  ('2c40ee2a-6294-4358-a029-2279f5b8c6c4'::uuid),
  ('9bf60b50-9e55-43d0-b514-e5102ac587fa'::uuid),
  ('17739485-24ed-49e3-ba01-e17fb709be04'::uuid),
  ('7ee694cf-9ba7-498b-b8eb-75b00b48c02a'::uuid),
  ('2accfbb4-35f2-4095-aa38-667d751be995'::uuid),
  ('3a9451cc-3100-451d-b977-8e4e56c725e9'::uuid),
  ('a24ea6b1-27cd-4d2f-86a4-d17a49780011'::uuid),
  ('f16dcad7-e31d-41cd-8f8f-5842ae1ce08f'::uuid),
  ('2ee1f743-6b12-4d73-9e19-efa1f10cd7cd'::uuid),
  ('d2c0acc8-2790-486a-8349-59d28454ee0d'::uuid),
  ('53ab300d-318f-4209-95cc-acf16774b803'::uuid),
  ('1eae8d68-0852-4acc-96b9-bfd83e79b6d4'::uuid),
  ('88b9e290-456e-4240-a91e-6d0c360d6fe0'::uuid),
  ('05a10224-afc9-42cf-a800-38f057e6828b'::uuid),
  ('167d8360-0410-4312-b089-07f071e7a114'::uuid),
  ('ea7b056d-32bf-4398-81ce-60b2c25dc0aa'::uuid),
  ('54e19574-4b41-42d4-8aa3-652040963d1f'::uuid),
  ('324e6381-7f58-4b1a-9154-66d677eded87'::uuid),
  ('daa0f8dc-20cd-480a-af98-d90c9441d778'::uuid),
  ('56e206e6-9c87-4075-9961-e56064b6b8ba'::uuid),
  ('25b52966-9dd4-49b3-ba2b-2bdc35dbaa26'::uuid),
  ('b8f49376-6269-43c7-8216-349ec617ea5f'::uuid),
  ('c00c6b35-e0b7-44b0-b08b-bb4af775c536'::uuid),
  ('507fced8-b7fb-4fb7-8031-3ffac7e9a52c'::uuid),
  ('0ab69565-58a6-4256-ba7f-90b8e7da2899'::uuid);

-- Snapshot affected hosts before deletion
CREATE TEMP TABLE tmp_affected_hosts(host_id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO tmp_affected_hosts(host_id)
SELECT DISTINCT p.host_id FROM podcasts p JOIN tmp_remove_english_podcasts r ON r.id=p.id WHERE p.host_id IS NOT NULL;

-- Remove dependent rows explicitly where FKs may not cascade in all environments
DELETE FROM episodes e USING tmp_remove_english_podcasts r WHERE e.podcast_id = r.id;
DELETE FROM podcasts p USING tmp_remove_english_podcasts r WHERE p.id = r.id;

-- Remove hosts only if no podcasts remain
DELETE FROM hosts h
USING tmp_affected_hosts a
WHERE h.id = a.host_id
  AND NOT EXISTS (SELECT 1 FROM podcasts p WHERE p.host_id = h.id);

COMMIT;
