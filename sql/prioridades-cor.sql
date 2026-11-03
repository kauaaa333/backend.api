DO $$
BEGIN
  ALTER TABLE public.prioridades ADD COLUMN IF NOT EXISTS cor varchar(7);
  UPDATE public.prioridades
  SET cor = CASE descricao
    WHEN 'baixissima' THEN '#64748B'
    WHEN 'baixa' THEN '#10B981'
    WHEN 'media' THEN '#EAB308'
    WHEN 'alta' THEN '#EF4444'
    WHEN 'urgente' THEN '#EC4899'
    ELSE '#94A3B8' END
  WHERE cor IS NULL;
  ALTER TABLE public.prioridades ALTER COLUMN cor SET DEFAULT '#94A3B8', ALTER COLUMN cor SET NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.prioridades'::regclass AND conname = 'prioridades_cor_hex') THEN
    ALTER TABLE public.prioridades ADD CONSTRAINT prioridades_cor_hex CHECK (cor ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;
