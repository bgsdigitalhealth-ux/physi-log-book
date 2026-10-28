CREATE TABLE public.website_content (
  key text PRIMARY KEY,
  content text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_content_key_length CHECK (char_length(key) BETWEEN 1 AND 2000),
  CONSTRAINT website_content_text_length CHECK (char_length(content) <= 10000)
);
GRANT SELECT ON public.website_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_content TO authenticated;
GRANT ALL ON public.website_content TO service_role;
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read website presentation content" ON public.website_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin edit website presentation content" ON public.website_content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_content;