


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "private"."has_staff_role"("allowed_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.staff_users as staff
    where staff.user_id = (select auth.uid())
      and staff.is_active = true
      and staff.role = any (coalesce(allowed_roles, array[]::text[]))
  );
$$;


ALTER FUNCTION "private"."has_staff_role"("allowed_roles" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "private"."has_staff_role"("allowed_roles" "text"[]) IS 'Returns whether the current authenticated user has an active staff record with one of the supplied roles.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_audit_logs" IS 'Append-only record of sensitive actions performed through the staff portal.';



CREATE TABLE IF NOT EXISTS "public"."newsletter_subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "source" "text" DEFAULT 'website'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."newsletter_subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "delivery_address" "text" NOT NULL,
    "delivery_city" "text" NOT NULL,
    "order_notes" "text",
    "subtotal" integer NOT NULL,
    "delivery_fee" integer NOT NULL,
    "total" integer NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "fulfillment_status" "text" DEFAULT 'new'::"text" NOT NULL,
    "paystack_reference" "text",
    "items" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "price" integer NOT NULL,
    "image_url" "text" NOT NULL,
    "shade" "text",
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "inventory_count" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "is_restocked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_users_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'inventory'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."staff_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."staff_users" IS 'Server-managed authorization records for authenticated Ekana staff.';



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_user_id_key" UNIQUE ("user_id");



CREATE INDEX "admin_audit_logs_entity_idx" ON "public"."admin_audit_logs" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "admin_audit_logs_staff_idx" ON "public"."admin_audit_logs" USING "btree" ("staff_user_id", "created_at" DESC);



CREATE INDEX "staff_users_active_user_id_idx" ON "public"."staff_users" USING "btree" ("user_id") WHERE ("is_active" = true);



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_authorized_staff_read" ON "public"."orders" FOR SELECT TO "authenticated" USING (( SELECT "private"."has_staff_role"(ARRAY['owner'::"text", 'admin'::"text", 'support'::"text"]) AS "has_staff_role"));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_active_staff_read_all" ON "public"."products" FOR SELECT TO "authenticated" USING (( SELECT "private"."has_staff_role"(ARRAY['owner'::"text", 'admin'::"text", 'inventory'::"text", 'support'::"text"]) AS "has_staff_role"));



CREATE POLICY "products_catalogue_staff_delete" ON "public"."products" FOR DELETE TO "authenticated" USING (( SELECT "private"."has_staff_role"(ARRAY['owner'::"text", 'admin'::"text", 'inventory'::"text"]) AS "has_staff_role"));



CREATE POLICY "products_catalogue_staff_insert" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "private"."has_staff_role"(ARRAY['owner'::"text", 'admin'::"text", 'inventory'::"text"]) AS "has_staff_role"));



CREATE POLICY "products_catalogue_staff_update" ON "public"."products" FOR UPDATE TO "authenticated" USING (( SELECT "private"."has_staff_role"(ARRAY['owner'::"text", 'admin'::"text", 'inventory'::"text"]) AS "has_staff_role")) WITH CHECK (( SELECT "private"."has_staff_role"(ARRAY['owner'::"text", 'admin'::"text", 'inventory'::"text"]) AS "has_staff_role"));



CREATE POLICY "products_public_read_active" ON "public"."products" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."staff_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_users_active_self_or_owner_read" ON "public"."staff_users" FOR SELECT TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_active" = true)) OR ( SELECT "private"."has_staff_role"(ARRAY['owner'::"text"]) AS "has_staff_role")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "private" TO "authenticated";
GRANT USAGE ON SCHEMA "private" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "private"."has_staff_role"("allowed_roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_staff_role"("allowed_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "private"."has_staff_role"("allowed_roles" "text"[]) TO "service_role";


















GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "service_role";
GRANT SELECT ON TABLE "public"."orders" TO "authenticated";



GRANT ALL ON TABLE "public"."products" TO "service_role";
GRANT SELECT ON TABLE "public"."products" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."products" TO "authenticated";



GRANT ALL ON TABLE "public"."staff_users" TO "service_role";
GRANT SELECT ON TABLE "public"."staff_users" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
