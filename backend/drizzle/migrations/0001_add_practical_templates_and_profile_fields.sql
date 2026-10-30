-- Practical templates (schema + viva + rubric) and extra student profile fields

alter table public.profiles
  add column if not exists locker text,
  add column if not exists academic_program text,
  add column if not exists guardian_name text,
  add column if not exists emergency_phone text;

create table if not exists public.practical_templates (
  code text primary key references public.practicals(code) on delete cascade,
  seq int not null,
  title text not null,
  category text not null,
  type text not null,
  author text,
  version text not null default 'v1.0 Draft',
  status text not null default 'Draft',
  aim text not null default '',
  principle text not null default '',
  apparatus text not null default '',
  procedure text not null default '',
  formula text not null default '',
  columns jsonb not null default '[]'::jsonb,
  viva_questions jsonb not null default '[]'::jsonb,
  max_marks int not null default 20,
  penalty int not null default 5,
  req_diagram boolean not null default true,
  req_calculations boolean not null default true,
  req_viva boolean not null default true,
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practical_templates TO authenticated;
GRANT ALL ON public.practical_templates TO service_role;
ALTER TABLE public.practical_templates ENABLE ROW LEVEL SECURITY;

drop policy if exists "Authenticated read templates" on public.practical_templates;
create policy "Authenticated read templates" on public.practical_templates
  for select to authenticated using (true);
drop policy if exists "Faculty and admin write templates" on public.practical_templates;
create policy "Faculty and admin write templates" on public.practical_templates
  for all to authenticated
  using (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'faculty') or public.has_role(auth.uid(),'admin'));

insert into public.practical_templates
  (code, seq, title, category, type, author, version, status, aim, principle, apparatus, procedure, formula, columns, viva_questions, max_marks, penalty)
values
  ('PH-EX-004',4,'Recording of Arterial Blood Pressure & Postural Variation','Cardiovascular','Clinical Examination','Dr. Smith R','v2.4 Active','Published',
   'To record the arterial blood pressure in a human subject in the supine, sitting, and standing postures using auscultatory and palpatory sphygmomanometry.',
   'Arterial blood pressure is the lateral pressure exerted by circulating blood upon the luminal walls of systemic arteries.',
   'Aneroid / Standard Mercury Sphygmomanometer with Riva-Rocci arm cuff, Littmann Dual-Head Stethoscope, examination couch, stopwatch, rubbing alcohol swabs.',
   '1. Subject rests supine for five minutes.
2. Estimate systolic by palpatory method.
3. Place stethoscope over the brachial artery.
4. Inflate and deflate at 2-3 mmHg per second noting Korotkoff sounds.
5. Repeat sitting and standing; compute PP and MAP.',
   'Pulse Pressure = Systolic - Diastolic (mmHg); MAP = Diastolic + (Pulse Pressure / 3) mmHg',
   '[{"label":"Posture","type":"text","unit":"-","validation":"Preset"},{"label":"Heart Rate (Pulse)","type":"number","unit":"bpm","validation":"50-130"},{"label":"Systolic BP","type":"number","unit":"mmHg","validation":"80-180"},{"label":"Diastolic BP","type":"number","unit":"mmHg","validation":"50-110"},{"label":"Pulse Pressure","type":"number","unit":"mmHg","validation":"Calculated"},{"label":"Mean Arterial Pressure","type":"number","unit":"mmHg","validation":"Calculated"}]'::jsonb,
   '["What are the five phases of Korotkoff sounds and what produces them?","Explain the baroreceptor reflex mechanism preventing postural syncope upon standing.","Why does diastolic pressure slightly increase upon standing while systolic may marginally dip?","Define Mean Arterial Pressure and state its physiological significance for organ perfusion."]'::jsonb,
   20,5),
  ('PH-EX-002',2,'Total Erythrocyte (RBC) Count by Hemocytometry','Hematology','Laboratory / Bench Work','Dr. R. Sengupta','v2.1 Active','Published',
   'To determine the total red blood cell (RBC) count per cubic millimeter of human blood using an Improved Neubauer Hemocytometer and Hayem isotonic diluting fluid.',
   'Blood is diluted 1:200 with Hayem fluid and counted in a known volume of the Neubauer chamber grid.',
   'Compound Microscope, Improved Neubauer Chamber, cover slip (0.4mm thick), RBC Thoma pipette (red bead), Hayem diluting fluid, sterile lancet, methylated spirit.',
   '1. Prick the fingertip after cleaning with methylated spirit.
2. Draw blood to the 0.5 mark of the RBC pipette.
3. Draw Hayem fluid to the 101 mark; mix for two minutes.
4. Discard the first few drops and charge the chamber.
5. Allow cells to settle and count the five marked squares.',
   'RBCs / mm3 = (N x Dilution Factor x Depth Factor) / Area Counted = N x 10,000',
   '[{"label":"Square Sector","type":"text","unit":"-","validation":"Preset"},{"label":"Top-Left Count","type":"number","unit":"cells","validation":"70-120"},{"label":"Top-Right Count","type":"number","unit":"cells","validation":"70-120"},{"label":"Bottom-Left Count","type":"number","unit":"cells","validation":"70-120"},{"label":"Bottom-Right Count","type":"number","unit":"cells","validation":"70-120"},{"label":"Center Count","type":"number","unit":"cells","validation":"70-120"}]'::jsonb,
   '["What is the composition and function of each chemical in Hayem diluting fluid?","Why are the first few drops discarded before charging the Neubauer chamber?","What are the normal total RBC counts in healthy adult males and females?","Explain the border rule used to avoid counting the same cell twice in grid counting."]'::jsonb,
   20,5),
  ('PH-EX-007',7,'Measurement of Vital Capacity by Spirometry','Respiratory','Laboratory / Bench Work','Dr. Ananya Roy','v2.2 Active','Published',
   'To measure the Tidal Volume, Inspiratory Reserve Volume, Expiratory Reserve Volume, and Vital Capacity of a human subject using a student spirometer.',
   'Spirometry is the gold standard diagnostic technique for recording respiratory volumes and capacities.',
   'Collins / Student Dry / Wet Rolling Seal Spirometer, sterile disposable mouthpieces, nose clip, measuring chart.',
   '1. Demonstrate the technique and fit the nose clip.
2. Record three resting breaths for tidal volume.
3. Instruct a maximal inspiratory effort for IRV.
4. Instruct a maximal expiration for ERV.
5. Repeat for three trials and record the best vital capacity.',
   'Vital Capacity (VC) = TV + IRV + ERV (mL); Predicted VC = [27.63 - (0.112 x Age in yrs)] x Height (cm)',
   '[{"label":"Trial No.","type":"number","unit":"-","validation":"1-3"},{"label":"Tidal Volume (TV)","type":"number","unit":"mL","validation":"400-700"},{"label":"Inspiratory Reserve (IRV)","type":"number","unit":"mL","validation":"1800-3300"},{"label":"Expiratory Reserve (ERV)","type":"number","unit":"mL","validation":"900-1400"},{"label":"Observed Vital Capacity","type":"number","unit":"mL","validation":"3000-5500"}]'::jsonb,
   '["Which lung volume cannot be measured by simple spirometry and why?","Differentiate between restrictive and obstructive ventilatory disorders on a spirogram.","What is FEV1 and why is the FEV1/FVC ratio clinically vital?","How does posture and athletic conditioning alter vital capacity?"]'::jsonb,
   20,5),
  ('PH-EX-001',1,'Study of Compound Microscope & Neubauer Chamber','Hematology','Laboratory / Bench Work','Dr. R. Sengupta','v1.9 Active','Published',
   'To study the optical and mechanical parts of the compound microscope and the dimensions of the Improved Neubauer chamber.',
   'Compound microscopy utilizes objective and ocular lenses to achieve dual magnification.',
   'Compound microscope, oil immersion lens, lens paper, stage micrometer, Neubauer chamber, glass coverslip.',
   '1. Inspect the mechanical and optical parts.
2. Calculate total magnification under low (10x), high-dry (40x), and oil immersion (100x).
3. Focus and measure the Neubauer grid.',
   'Total Magnification = Objective Lens Power x Eye-Piece Power (10x x 10x = 100x; 40x x 10x = 400x)',
   '[{"label":"Objective","type":"text","unit":"-","validation":"Preset"},{"label":"Focal Length","type":"text","unit":"mm","validation":"-"},{"label":"Numerical Aperture","type":"number","unit":"NA","validation":"0.25-1.25"},{"label":"Total Magnification","type":"text","unit":"x","validation":"-"}]'::jsonb,
   '["Why is cedarwood oil used with the 100x immersion objective lens?","What is numerical aperture and how does it influence microscope resolution?","State the exact depth and volume of one small square in the center Neubauer grid."]'::jsonb,
   20,5),
  ('PH-EX-003',3,'Determination of Hemoglobin by Sahli Method','Hematology','Laboratory / Bench Work','Dr. M. K. Rao','v1.4 Active','Published',
   'To estimate hemoglobin concentration in human capillary blood using Sahli hemoglobinometer.',
   'Hemoglobin is converted to acid hematin by hydrochloric acid (0.1 N HCl).',
   'Sahli hemometer, graduated tube, Hb pipette (20 uL), 0.1 N HCl, distilled water, glass stirrer.',
   '1. Add 0.1 N HCl up to the 2 g% mark.
2. Draw capillary blood up to 20 uL and expel into the tube.
3. Allow ten minutes for acid hematin to develop.
4. Dilute with distilled water to colour match and read.',
   'Hb (g/dL) read directly from graduated tube at lower meniscus.',
   '[{"label":"Subject","type":"text","unit":"-","validation":"-"},{"label":"10-min Color Match","type":"text","unit":"Visual","validation":"-"},{"label":"Observed Hb (g/dL)","type":"number","unit":"g/dL","validation":"8-19"},{"label":"Percentage of Normal","type":"number","unit":"%","validation":"Calculated"}]'::jsonb,
   '["Why does Sahli method underestimate carboxyhemoglobin and methemoglobin?","What are the physiological causes of polycythemia?","Why must we wait 10 minutes before reading the Sahli tube?"]'::jsonb,
   20,5)
on conflict (code) do nothing;