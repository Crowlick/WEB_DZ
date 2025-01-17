--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment (
    id uuid NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.equipment OWNER TO postgres;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff (
    id uuid NOT NULL,
    full_name character varying(50) NOT NULL,
    "position" integer NOT NULL
);


ALTER TABLE public.staff OWNER TO postgres;

--
-- Name: task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task (
    id uuid NOT NULL,
    staff_id uuid NOT NULL,
    equipment_id uuid NOT NULL,
    start_book_date date NOT NULL,
    end_book_date date NOT NULL
);


ALTER TABLE public.task OWNER TO postgres;

--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment (id, name) FROM stdin;
76484ea2-7eb8-4023-b169-9f29b92e5d53	╨д╤А╨╡╨╖╨╡╤А╨╜╤Л╨╣ ╤Б╤В╨░╨╜╨╛╨║
e0f4d30b-6199-4397-bb79-5f2f0fdf01be	╨Ь╨░╤И╨╕╨╜╨░
7c179d95-384c-4a2d-92be-cd1b3aa6149d	╨Ъ╤Г╨▒ ╨║╨╛╨╝╨┐╨░╨╜╤М╨╛╨╜
49bebc41-f1b9-4c9e-8893-2885136f505f	╨Я╨╗╨░╨╖╨╝╨╡╨╜╨╜╤Л╨╣ ╤А╨╡╨╖╨░╨║
8256c4c7-4f56-4039-8cad-24bf9fc1ad2a	╨б╨║╤А╤Л╤В╤Л╨╣ ╨║╨╗╨╕╨╜╨╛╨║
7c44d8e0-8d13-4742-a44b-0dae2fd22439	Pietro Beretta M92F
3bc6b0df-ddae-44a8-aa31-172337737746	╨Ъ╨╛╤А╨╛╨▒╨║╨░ ╨┐╨╕╤Ж╤Ж╤Л
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff (id, full_name, "position") FROM stdin;
c5c79280-01f3-48a6-adbf-1576ba76d22e	╨з╨╡╨╗╨╗	0
15fd042b-1bd0-4a9a-8d6a-a822f69b1e85	╨Я╨╡╨┐╨┐╨╕╨╜╨╛ ╨б╨┐╨░╨│╨╡╤В╤В╨╕	1
a7def604-14a7-4884-bdff-590439f13875	╨Ъ╨╛╤А╨▓╨╛ ╨Р╤В╤В╨░╨╜╨╛	2
25494404-30b9-414a-a0cb-c885259fa387	╨б╤Г╨┤╤М╤П ╨У╨░╨▒╤А╨╕╤Н╨╗╤М	3
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task (id, staff_id, equipment_id, start_book_date, end_book_date) FROM stdin;
c21c00ad-babe-4970-9dcb-da80d700bc1b	15fd042b-1bd0-4a9a-8d6a-a822f69b1e85	49bebc41-f1b9-4c9e-8893-2885136f505f	2025-02-01	2025-02-08
820d603e-3b27-44bc-88c7-87ecba6189e0	15fd042b-1bd0-4a9a-8d6a-a822f69b1e85	7c44d8e0-8d13-4742-a44b-0dae2fd22439	2025-01-09	2025-01-17
1794b73f-be1d-45e0-9503-60c510a9f29c	15fd042b-1bd0-4a9a-8d6a-a822f69b1e85	8256c4c7-4f56-4039-8cad-24bf9fc1ad2a	2025-01-26	2025-01-31
7db60939-246a-4f28-baef-44ae2aa13250	25494404-30b9-414a-a0cb-c885259fa387	e0f4d30b-6199-4397-bb79-5f2f0fdf01be	2025-01-18	2025-02-01
\.


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff staff_position_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.staff
    ADD CONSTRAINT staff_position_check CHECK (("position" >= 0)) NOT VALID;


--
-- Name: task test_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.task
    ADD CONSTRAINT test_check CHECK ((start_book_date < end_book_date)) NOT VALID;


--
-- Name: task test_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT test_pkey PRIMARY KEY (id);


--
-- Name: task test_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT test_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id);


--
-- Name: task test_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT test_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: TABLE equipment; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.equipment TO etadmin;


--
-- Name: TABLE staff; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.staff TO etadmin;


--
-- Name: TABLE task; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task TO etadmin;


--
-- PostgreSQL database dump complete
--

