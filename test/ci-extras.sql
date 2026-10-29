-- Somente CI: definições SQL lidas do catálogo do Neon em 29/10/2026.
-- Aplicar APENAS via setup-ci.cjs após prisma db push no banco efêmero.

ALTER TABLE public.auditoria_tarefas ADD CONSTRAINT auditoria_tarefas_coluna_antes_check CHECK (((coluna_antes IS NULL) OR ((coluna_antes)::text = ANY ((ARRAY['afazer'::character varying, 'andamento'::character varying, 'concluido'::character varying])::text[]))));

ALTER TABLE public.auditoria_tarefas ADD CONSTRAINT auditoria_tarefas_coluna_depois_check CHECK (((coluna_depois IS NULL) OR ((coluna_depois)::text = ANY ((ARRAY['afazer'::character varying, 'andamento'::character varying, 'concluido'::character varying])::text[]))));

ALTER TABLE public.auditoria_tarefas ADD CONSTRAINT auditoria_tarefas_operacao_check CHECK (((operacao)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[])));

ALTER TABLE public.usuarios ADD CONSTRAINT chk_email CHECK (((email)::text ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'::text));

ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_coluna_check CHECK (((coluna)::text = ANY ((ARRAY['afazer'::character varying, 'andamento'::character varying, 'concluido'::character varying])::text[])));

ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_email_normalizado CHECK (((email)::text = lower(btrim((email)::text))));

CREATE OR REPLACE FUNCTION public.avancar_tarefa(p_tarefa_id integer)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE v_atual varchar; v_proxima varchar; v_usuario integer;
BEGIN
 PERFORM pg_advisory_xact_lock(731309);
 SELECT coluna,usuario_id INTO v_atual,v_usuario FROM tarefas WHERE id=p_tarefa_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
 v_proxima:=CASE v_atual WHEN 'afazer' THEN 'andamento' WHEN 'andamento' THEN 'concluido' ELSE v_atual END;
 IF v_proxima=v_atual THEN RETURN v_atual; END IF;
 IF v_proxima='andamento' AND v_usuario IS NOT NULL AND
 (SELECT COUNT(*) FROM tarefas WHERE usuario_id=v_usuario AND coluna='andamento' AND id<>p_tarefa_id)>=2 THEN
 RAISE EXCEPTION 'Limite de 2 tarefas em andamento atingido';
 END IF;
 UPDATE tarefas SET coluna=v_proxima WHERE id=p_tarefa_id;
 RETURN v_proxima;
END; $function$;

CREATE OR REPLACE FUNCTION public.fn_atualizar_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Marca a data/hora da ultima alteracao do registro
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_auditar_tarefa()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE v_ator integer; v_origem varchar(10);
BEGIN
 v_ator := NULLIF(current_setting('app.usuario_id',true),'')::integer;
 v_origem := CASE WHEN v_ator IS NULL THEN 'banco' ELSE 'api' END;
 IF TG_OP='INSERT' THEN
  INSERT INTO auditoria_tarefas(tarefa_id,operacao,coluna_depois,alterado_por,responsavel_id,origem)
  VALUES(NEW.id,'INSERT',NEW.coluna,v_ator,NEW.usuario_id,v_origem);
 ELSIF TG_OP='UPDATE' AND OLD.coluna IS DISTINCT FROM NEW.coluna THEN
  INSERT INTO auditoria_tarefas(tarefa_id,operacao,coluna_antes,coluna_depois,alterado_por,responsavel_id,origem)
  VALUES(NEW.id,'UPDATE',OLD.coluna,NEW.coluna,v_ator,NEW.usuario_id,v_origem);
 ELSIF TG_OP='DELETE' THEN
  INSERT INTO auditoria_tarefas(tarefa_id,operacao,coluna_antes,alterado_por,responsavel_id,origem)
  VALUES(OLD.id,'DELETE',OLD.coluna,v_ator,OLD.usuario_id,v_origem);
 END IF;
 RETURN NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.fn_registrar_conclusao()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.coluna = 'concluido' THEN
    IF TG_OP = 'INSERT' THEN NEW.concluida_em := COALESCE(NEW.concluida_em,NOW());
    ELSIF OLD.coluna IS DISTINCT FROM NEW.coluna THEN NEW.concluida_em := NOW();
    ELSE NEW.concluida_em := OLD.concluida_em;
    END IF;
  ELSE NEW.concluida_em := NULL;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.registrar_inicio_andamento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Grava a data/hora sempre que a tarefa ENTRA na coluna 'andamento'
  IF NEW.coluna = 'andamento' AND (TG_OP = 'INSERT' OR OLD.coluna IS DISTINCT FROM 'andamento') THEN
    NEW.iniciada_em := NOW();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE UNIQUE INDEX projetos_nome_unico ON public.projetos USING btree (lower(btrim((nome)::text)));

CREATE TRIGGER tarefas_registrar_inicio_andamento BEFORE INSERT OR UPDATE OF coluna ON public.tarefas FOR EACH ROW EXECUTE FUNCTION registrar_inicio_andamento();

CREATE TRIGGER trg_auditoria_tarefas AFTER INSERT OR DELETE OR UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION fn_auditar_tarefa();

CREATE TRIGGER trg_comentarios_atualizado BEFORE UPDATE ON public.comentarios FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE TRIGGER trg_projetos_atualizado BEFORE UPDATE ON public.projetos FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE TRIGGER trg_registrar_conclusao BEFORE INSERT OR UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION fn_registrar_conclusao();

CREATE TRIGGER trg_tarefas_atualizado BEFORE UPDATE ON public.tarefas FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE TRIGGER trg_usuarios_atualizado BEFORE UPDATE ON public.usuarios FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION fn_atualizar_timestamp();
