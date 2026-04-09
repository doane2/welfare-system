--
-- PostgreSQL database dump
--

\restrict CzfeCGNe1fffVshPYwwS9DqMgeXwyaxdJulxcoChnH4Su0xUZjxtJ1VXLxVwkXq

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AccountStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AccountStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ANONYMISED'
);


ALTER TYPE public."AccountStatus" OWNER TO postgres;

--
-- Name: BeneficiaryRequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BeneficiaryRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."BeneficiaryRequestStatus" OWNER TO postgres;

--
-- Name: BeneficiaryRequestType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BeneficiaryRequestType" AS ENUM (
    'ADD',
    'UPDATE',
    'REMOVE'
);


ALTER TYPE public."BeneficiaryRequestType" OWNER TO postgres;

--
-- Name: ClaimStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ClaimStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ClaimStatus" OWNER TO postgres;

--
-- Name: ClaimType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ClaimType" AS ENUM (
    'MEDICAL',
    'DEATH',
    'DISABILITY',
    'EDUCATION'
);


ALTER TYPE public."ClaimType" OWNER TO postgres;

--
-- Name: ContributionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ContributionStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ContributionStatus" OWNER TO postgres;

--
-- Name: ContributionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ContributionType" AS ENUM (
    'MONTHLY',
    'REGISTRATION',
    'EMERGENCY'
);


ALTER TYPE public."ContributionType" OWNER TO postgres;

--
-- Name: DeceasedEntityType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DeceasedEntityType" AS ENUM (
    'MEMBER',
    'DEPENDENT'
);


ALTER TYPE public."DeceasedEntityType" OWNER TO postgres;

--
-- Name: DependentType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DependentType" AS ENUM (
    'CHILD_UNDER_18',
    'CHILD_18_25',
    'PARENT',
    'SIBLING',
    'NEXT_OF_KIN'
);


ALTER TYPE public."DependentType" OWNER TO postgres;

--
-- Name: LoanStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LoanStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'PAID'
);


ALTER TYPE public."LoanStatus" OWNER TO postgres;

--
-- Name: MemberType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MemberType" AS ENUM (
    'FAMILY',
    'SINGLE'
);


ALTER TYPE public."MemberType" OWNER TO postgres;

--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'EMAIL',
    'SMS',
    'IN_APP'
);


ALTER TYPE public."NotificationChannel" OWNER TO postgres;

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


ALTER TYPE public."NotificationStatus" OWNER TO postgres;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'MPESA',
    'BANK',
    'CASH'
);


ALTER TYPE public."PaymentMethod" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REVERSED',
    'PENDING_APPROVAL',
    'APPROVED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'TREASURER',
    'SECRETARY',
    'MEMBER'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Announcement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Announcement" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "attachmentUrl" text,
    priority boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Announcement" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: BeneficiaryRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BeneficiaryRequest" (
    id text NOT NULL,
    type public."BeneficiaryRequestType" NOT NULL,
    status public."BeneficiaryRequestStatus" DEFAULT 'PENDING'::public."BeneficiaryRequestStatus" NOT NULL,
    "memberId" text NOT NULL,
    "dependentId" text,
    "fullName" text,
    "dependentType" text,
    "dateOfBirth" timestamp(3) without time zone,
    "nationalId" text,
    "birthCertNumber" text,
    phone text,
    relationship text,
    notes text,
    "processedById" text,
    "processedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdDependentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BeneficiaryRequest" OWNER TO postgres;

--
-- Name: Claim; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Claim" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status public."ClaimStatus" DEFAULT 'PENDING'::public."ClaimStatus" NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    amount double precision,
    "reviewedById" text,
    type public."ClaimType" NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "rejectionReason" text
);


ALTER TABLE public."Claim" OWNER TO postgres;

--
-- Name: ClaimDocument; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ClaimDocument" (
    id text NOT NULL,
    url text NOT NULL,
    filename text NOT NULL,
    "mimeType" text,
    "claimId" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClaimDocument" OWNER TO postgres;

--
-- Name: Contribution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Contribution" (
    id text NOT NULL,
    amount double precision NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    paid boolean DEFAULT false NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedById" text,
    period text,
    status public."ContributionStatus" DEFAULT 'PENDING'::public."ContributionStatus" NOT NULL,
    type public."ContributionType" DEFAULT 'MONTHLY'::public."ContributionType" NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Contribution" OWNER TO postgres;

--
-- Name: DeceasedRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DeceasedRecord" (
    id text NOT NULL,
    "entityType" public."DeceasedEntityType" NOT NULL,
    "entityId" text NOT NULL,
    "memberId" text,
    "dependentId" text,
    "deceasedAt" timestamp(3) without time zone NOT NULL,
    notes text,
    "flaggedById" text NOT NULL,
    "flaggedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isReversed" boolean DEFAULT false NOT NULL,
    "reversedById" text,
    "reversedAt" timestamp(3) without time zone,
    "reversalReason" text
);


ALTER TABLE public."DeceasedRecord" OWNER TO postgres;

--
-- Name: Dependent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Dependent" (
    id text NOT NULL,
    "fullName" text NOT NULL,
    type public."DependentType" NOT NULL,
    "dateOfBirth" timestamp(3) without time zone,
    "nationalId" text,
    "birthCertNumber" text,
    phone text,
    relationship text,
    notified boolean DEFAULT false NOT NULL,
    "memberId" text NOT NULL,
    "addedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deceasedAt" timestamp(3) without time zone,
    "deceasedNotes" text,
    "isDeceased" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Dependent" OWNER TO postgres;

--
-- Name: Group; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Group" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Group" OWNER TO postgres;

--
-- Name: Loan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Loan" (
    id text NOT NULL,
    status public."LoanStatus" DEFAULT 'PENDING'::public."LoanStatus" NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "interestRate" double precision NOT NULL,
    principal double precision NOT NULL,
    "repaymentSchedule" jsonb,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "documentUrl" text,
    "activatedById" text,
    "loanLimitSnapshot" double precision,
    notes text
);


ALTER TABLE public."Loan" OWNER TO postgres;

--
-- Name: LoanRepayment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LoanRepayment" (
    id text NOT NULL,
    amount double precision NOT NULL,
    "loanId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoanRepayment" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    channel public."NotificationChannel" DEFAULT 'IN_APP'::public."NotificationChannel" NOT NULL,
    "sentAt" timestamp(3) without time zone,
    status public."NotificationStatus" DEFAULT 'PENDING'::public."NotificationStatus" NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    amount double precision NOT NULL,
    method public."PaymentMethod" NOT NULL,
    "userId" text NOT NULL,
    "contributionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "mpesaRef" text,
    "rawWebhook" jsonb,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    phone text,
    password text,
    role public."UserRole" DEFAULT 'MEMBER'::public."UserRole" NOT NULL,
    "groupId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "activationToken" text,
    "isActive" boolean DEFAULT false NOT NULL,
    "memberNumber" text,
    "createdByAdminId" text,
    "nationalId" text,
    "profilePhoto" text,
    "loanEligible" boolean DEFAULT false NOT NULL,
    "loanLimitOverride" double precision,
    "memberType" public."MemberType" DEFAULT 'SINGLE'::public."MemberType" NOT NULL,
    "monthlyRate" double precision DEFAULT 200 NOT NULL,
    "deceasedAt" timestamp(3) without time zone,
    "deceasedNotes" text,
    "isDeceased" boolean DEFAULT false NOT NULL,
    "otpCode" text,
    "otpExpiry" timestamp(3) without time zone,
    "accountStatus" public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    "anonymisedAt" timestamp(3) without time zone,
    "deactivatedAt" timestamp(3) without time zone,
    "resetToken" text,
    "resetTokenExpiry" timestamp(3) without time zone
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Announcement" (id, title, content, active, "createdAt", "updatedAt", "attachmentUrl", priority) FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, action, entity, "entityId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: BeneficiaryRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BeneficiaryRequest" (id, type, status, "memberId", "dependentId", "fullName", "dependentType", "dateOfBirth", "nationalId", "birthCertNumber", phone, relationship, notes, "processedById", "processedAt", "rejectionReason", "createdDependentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Claim; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Claim" (id, title, description, status, "userId", "createdAt", amount, "reviewedById", type, "updatedAt", "rejectionReason") FROM stdin;
\.


--
-- Data for Name: ClaimDocument; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ClaimDocument" (id, url, filename, "mimeType", "claimId", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: Contribution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Contribution" (id, amount, "dueDate", paid, "userId", "createdAt", "approvedAt", "approvedById", period, status, type, "updatedAt") FROM stdin;
\.


--
-- Data for Name: DeceasedRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DeceasedRecord" (id, "entityType", "entityId", "memberId", "dependentId", "deceasedAt", notes, "flaggedById", "flaggedAt", "isReversed", "reversedById", "reversedAt", "reversalReason") FROM stdin;
\.


--
-- Data for Name: Dependent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Dependent" (id, "fullName", type, "dateOfBirth", "nationalId", "birthCertNumber", phone, relationship, notified, "memberId", "addedById", "createdAt", "updatedAt", "deceasedAt", "deceasedNotes", "isDeceased") FROM stdin;
\.


--
-- Data for Name: Group; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Group" (id, name, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Loan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Loan" (id, status, "userId", "createdAt", "interestRate", principal, "repaymentSchedule", "updatedAt", "documentUrl", "activatedById", "loanLimitSnapshot", notes) FROM stdin;
\.


--
-- Data for Name: LoanRepayment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LoanRepayment" (id, amount, "loanId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, title, message, read, "userId", "createdAt", channel, "sentAt", status) FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, amount, method, "userId", "contributionId", "createdAt", "mpesaRef", "rawWebhook", status) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, "fullName", email, phone, password, role, "groupId", "createdAt", "updatedAt", "activationToken", "isActive", "memberNumber", "createdByAdminId", "nationalId", "profilePhoto", "loanEligible", "loanLimitOverride", "memberType", "monthlyRate", "deceasedAt", "deceasedNotes", "isDeceased", "otpCode", "otpExpiry", "accountStatus", "anonymisedAt", "deactivatedAt", "resetToken", "resetTokenExpiry") FROM stdin;
92a88cd6-ec6c-4792-b733-42fb4b765c53	Laurie Mong'ina	lauriemongina5@gmail.com	\N	$2b$10$KYn7gia6/SgKhztsJJsb5Oubs3cSVKHLfuV3pWlEDwVlhnYUwo1ui	SECRETARY	\N	2026-04-06 08:58:33.794	2026-04-08 13:28:48.762	\N	t	\N	\N	\N	\N	f	\N	SINGLE	200	\N	\N	f	\N	\N	ACTIVE	\N	\N	\N	\N
c7e5e6f3-5c81-4bc8-9667-4d7e9dc8dae3	Doane Musa	doanemusa561@gmail.com	\N	$2b$10$TLwo83V9oG6pe5NxZwMU2OS9AzhX2kG2Fc3AKodBZGAhuSOIsKIEi	SUPER_ADMIN	\N	2026-04-06 08:58:31.44	2026-04-08 19:18:11.723	\N	t	\N	\N	\N	\N	f	\N	SINGLE	200	\N	\N	f	$2b$10$AsOnazxuHGtzaq9XPxlRZOyFwhN1BCziRfIDghlAXgx/6npx6j.iK	2026-04-08 19:28:11.67	ACTIVE	\N	\N	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
becd5374-ba37-447f-b3e2-ede48534c009	4b907a43480d04c6968f32d94125988e7032641ee40ff79b079650e7c2589e6d	2026-04-06 08:49:17.509448+00	20260312101435_welfare_schema_v1	\N	\N	2026-04-06 08:49:05.490694+00	1
c0b8b1b9-0286-449a-95fb-99a3bb847681	48c0509d8281a48db9fb288ef5b35450f0569e0271129308d1df2a55845efc07	2026-04-06 08:50:09.244735+00	20260325114541_add_account_status_and_reset_token	\N	\N	2026-04-06 08:50:06.89004+00	1
ec045ead-8dfe-4fdf-ba5a-f3f97aa82082	9b80fff50dc7abf7d3ed1fa266e0e5cc66b97b4b5a2ca70aae14fc7c0fd5412a	2026-04-06 08:49:19.884425+00	20260312121335_add_activation_fields	\N	\N	2026-04-06 08:49:18.216899+00	1
17310052-d9d5-4d09-b784-7833a5c0cda2	5b8202f865be6057b2751cf6978390c075106880a7e3d60e7e4fc07dd1e38098	2026-04-06 08:49:22.592372+00	20260312184727_add_member_number	\N	\N	2026-04-06 08:49:20.548327+00	1
cf9929c6-233d-4006-b839-1b6bfbf574d2	7ec4dff718c29b2ba18f8f5b2f1d2c9a6c667d244a4ce545295c155731ccd6a2	2026-04-06 08:49:35.488297+00	20260313124447_update_schema_add_missing_fields	\N	\N	2026-04-06 08:49:23.320087+00	1
66f52ff4-019e-4d5f-8264-10362654baff	fd0ed3aec75352862b812ed8b347d91083ad6cd99cda61e5222bac8abf3bc4f7	2026-04-06 08:50:18.516809+00	20260326122302_add_performance_indexes	\N	\N	2026-04-06 08:50:09.941771+00	1
1a6b8574-219e-4d6e-bcf9-ca4e4af47f61	fc6ad4ff5ab26cb90c74cd2e1652cbf8a8f1e71d288c24cc85abaebfc85dbe37	2026-04-06 08:49:38.512686+00	20260313152227_add_cloud_storage_fields	\N	\N	2026-04-06 08:49:36.162589+00	1
c252129d-fb52-42c2-b7c2-cf2e22401a87	f101a5d99dc9b8f9bbc78851746f999f6594e687f0eca2282af68b911bd4adb9	2026-04-06 08:49:41.189632+00	20260318101409_add_payment_status_values	\N	\N	2026-04-06 08:49:39.186833+00	1
11e0bdb9-1f8d-4191-85b0-f05716315bc4	617c9a46ddc66e18cd17102f123a56a01cebc825142ee26f6384b65da1f7d78c	2026-04-06 08:49:46.183026+00	20260318115156_add_dependents_loan_limits	\N	\N	2026-04-06 08:49:42.434586+00	1
ddc01cec-f91f-4517-9d46-ca2f511ffe5c	bee95db53e4ecb5f2f1021c5304055c19c863083b30d143e73fecb521fea98d1	2026-04-06 08:49:48.521866+00	20260318150059_add_monthly_rate	\N	\N	2026-04-06 08:49:46.861193+00	1
b0aca36e-44a7-41ac-a7a9-39f7beeb82b0	134794a7e9d21ea77f95c41e2637b99fcdce6bd3fd0a919410cf017f1692d58d	2026-04-06 08:49:54.47814+00	20260319124606_add_deceased_fields	\N	\N	2026-04-06 08:49:49.185388+00	1
9872ba27-4fb2-4269-80f6-0b412dece4e4	af9faa3bd9a8d7e2d41db47fabc9dd4097e3564f18922574e006479866880e66	2026-04-06 08:49:56.915321+00	20260322141243_add_announcement_fields	\N	\N	2026-04-06 08:49:55.228851+00	1
9693d111-d2cd-4ee3-a41d-6db58af88ae4	7f04780e8f63007a2de88df2e574b143eedf287ef38df3dea8b82a1b561cd720	2026-04-06 08:49:59.542138+00	20260322154215_add_claim_rejection_reason	\N	\N	2026-04-06 08:49:57.576171+00	1
d3edf132-24e7-43f9-8b47-77701173d833	41853b45b8496948eec34438e4eb760ab26a4ab897d3aa66ace23788431e6387	2026-04-06 08:50:01.87023+00	20260322182516_add_otp_fields	\N	\N	2026-04-06 08:50:00.204772+00	1
894c9038-f68e-4310-89c4-13e278b20e0d	62982d4fa458d4d389ba44d259e83be5010688ab7ebcca4110b81dbb774e43d7	2026-04-06 08:50:06.22366+00	20260323171321_add_beneficiary_requests	\N	\N	2026-04-06 08:50:02.543082+00	1
\.


--
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BeneficiaryRequest BeneficiaryRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BeneficiaryRequest"
    ADD CONSTRAINT "BeneficiaryRequest_pkey" PRIMARY KEY (id);


--
-- Name: ClaimDocument ClaimDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimDocument"
    ADD CONSTRAINT "ClaimDocument_pkey" PRIMARY KEY (id);


--
-- Name: Claim Claim_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Claim"
    ADD CONSTRAINT "Claim_pkey" PRIMARY KEY (id);


--
-- Name: Contribution Contribution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Contribution"
    ADD CONSTRAINT "Contribution_pkey" PRIMARY KEY (id);


--
-- Name: DeceasedRecord DeceasedRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DeceasedRecord"
    ADD CONSTRAINT "DeceasedRecord_pkey" PRIMARY KEY (id);


--
-- Name: Dependent Dependent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Dependent"
    ADD CONSTRAINT "Dependent_pkey" PRIMARY KEY (id);


--
-- Name: Group Group_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Group"
    ADD CONSTRAINT "Group_pkey" PRIMARY KEY (id);


--
-- Name: LoanRepayment LoanRepayment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoanRepayment"
    ADD CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY (id);


--
-- Name: Loan Loan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Loan"
    ADD CONSTRAINT "Loan_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Announcement_active_priority_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Announcement_active_priority_createdAt_idx" ON public."Announcement" USING btree (active, priority, "createdAt" DESC);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt" DESC);


--
-- Name: AuditLog_entity_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_entity_createdAt_idx" ON public."AuditLog" USING btree (entity, "createdAt" DESC);


--
-- Name: AuditLog_entity_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_entity_entityId_idx" ON public."AuditLog" USING btree (entity, "entityId");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: BeneficiaryRequest_memberId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BeneficiaryRequest_memberId_idx" ON public."BeneficiaryRequest" USING btree ("memberId");


--
-- Name: BeneficiaryRequest_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BeneficiaryRequest_status_createdAt_idx" ON public."BeneficiaryRequest" USING btree (status, "createdAt" DESC);


--
-- Name: BeneficiaryRequest_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BeneficiaryRequest_status_idx" ON public."BeneficiaryRequest" USING btree (status);


--
-- Name: ClaimDocument_claimId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ClaimDocument_claimId_idx" ON public."ClaimDocument" USING btree ("claimId");


--
-- Name: Claim_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Claim_status_createdAt_idx" ON public."Claim" USING btree (status, "createdAt" DESC);


--
-- Name: Claim_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Claim_status_idx" ON public."Claim" USING btree (status);


--
-- Name: Claim_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Claim_userId_idx" ON public."Claim" USING btree ("userId");


--
-- Name: Claim_userId_type_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Claim_userId_type_status_idx" ON public."Claim" USING btree ("userId", type, status);


--
-- Name: Contribution_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Contribution_period_idx" ON public."Contribution" USING btree (period);


--
-- Name: Contribution_period_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Contribution_period_status_idx" ON public."Contribution" USING btree (period, status);


--
-- Name: Contribution_status_type_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Contribution_status_type_createdAt_idx" ON public."Contribution" USING btree (status, type, "createdAt" DESC);


--
-- Name: Contribution_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Contribution_userId_idx" ON public."Contribution" USING btree ("userId");


--
-- Name: Contribution_userId_paid_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Contribution_userId_paid_type_idx" ON public."Contribution" USING btree ("userId", paid, type);


--
-- Name: DeceasedRecord_dependentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DeceasedRecord_dependentId_idx" ON public."DeceasedRecord" USING btree ("dependentId");


--
-- Name: DeceasedRecord_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DeceasedRecord_entityType_entityId_idx" ON public."DeceasedRecord" USING btree ("entityType", "entityId");


--
-- Name: DeceasedRecord_isReversed_flaggedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DeceasedRecord_isReversed_flaggedAt_idx" ON public."DeceasedRecord" USING btree ("isReversed", "flaggedAt" DESC);


--
-- Name: DeceasedRecord_memberId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DeceasedRecord_memberId_idx" ON public."DeceasedRecord" USING btree ("memberId");


--
-- Name: Dependent_memberId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Dependent_memberId_idx" ON public."Dependent" USING btree ("memberId");


--
-- Name: Dependent_memberId_isDeceased_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Dependent_memberId_isDeceased_idx" ON public."Dependent" USING btree ("memberId", "isDeceased");


--
-- Name: LoanRepayment_loanId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoanRepayment_loanId_idx" ON public."LoanRepayment" USING btree ("loanId");


--
-- Name: Loan_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Loan_status_createdAt_idx" ON public."Loan" USING btree (status, "createdAt" DESC);


--
-- Name: Loan_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Loan_status_idx" ON public."Loan" USING btree (status);


--
-- Name: Loan_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Loan_userId_idx" ON public."Loan" USING btree ("userId");


--
-- Name: Loan_userId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Loan_userId_status_idx" ON public."Loan" USING btree ("userId", status);


--
-- Name: Notification_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_status_idx" ON public."Notification" USING btree (status);


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: Notification_userId_read_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_userId_read_createdAt_idx" ON public."Notification" USING btree ("userId", read, "createdAt" DESC);


--
-- Name: Payment_contributionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_contributionId_idx" ON public."Payment" USING btree ("contributionId");


--
-- Name: Payment_mpesaRef_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_mpesaRef_idx" ON public."Payment" USING btree ("mpesaRef");


--
-- Name: Payment_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_status_createdAt_idx" ON public."Payment" USING btree (status, "createdAt" DESC);


--
-- Name: Payment_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_userId_idx" ON public."Payment" USING btree ("userId");


--
-- Name: User_accountStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_accountStatus_idx" ON public."User" USING btree ("accountStatus");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_isDeceased_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_isDeceased_idx" ON public."User" USING btree ("isDeceased");


--
-- Name: User_memberNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_memberNumber_idx" ON public."User" USING btree ("memberNumber");


--
-- Name: User_memberNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_memberNumber_key" ON public."User" USING btree ("memberNumber");


--
-- Name: User_nationalId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_nationalId_idx" ON public."User" USING btree ("nationalId");


--
-- Name: User_nationalId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_nationalId_key" ON public."User" USING btree ("nationalId");


--
-- Name: User_role_accountStatus_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_role_accountStatus_createdAt_idx" ON public."User" USING btree (role, "accountStatus", "createdAt" DESC);


--
-- Name: User_role_accountStatus_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_role_accountStatus_isActive_idx" ON public."User" USING btree (role, "accountStatus", "isActive");


--
-- Name: User_role_groupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_role_groupId_idx" ON public."User" USING btree (role, "groupId");


--
-- Name: User_role_isActive_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_role_isActive_createdAt_idx" ON public."User" USING btree (role, "isActive", "createdAt" DESC);


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BeneficiaryRequest BeneficiaryRequest_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BeneficiaryRequest"
    ADD CONSTRAINT "BeneficiaryRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BeneficiaryRequest BeneficiaryRequest_processedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BeneficiaryRequest"
    ADD CONSTRAINT "BeneficiaryRequest_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClaimDocument ClaimDocument_claimId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimDocument"
    ADD CONSTRAINT "ClaimDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES public."Claim"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Claim Claim_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Claim"
    ADD CONSTRAINT "Claim_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Claim Claim_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Claim"
    ADD CONSTRAINT "Claim_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Contribution Contribution_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Contribution"
    ADD CONSTRAINT "Contribution_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Contribution Contribution_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Contribution"
    ADD CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DeceasedRecord DeceasedRecord_dependentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DeceasedRecord"
    ADD CONSTRAINT "DeceasedRecord_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES public."Dependent"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DeceasedRecord DeceasedRecord_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DeceasedRecord"
    ADD CONSTRAINT "DeceasedRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Dependent Dependent_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Dependent"
    ADD CONSTRAINT "Dependent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LoanRepayment LoanRepayment_loanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoanRepayment"
    ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES public."Loan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Loan Loan_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Loan"
    ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_contributionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES public."Contribution"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_createdByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict CzfeCGNe1fffVshPYwwS9DqMgeXwyaxdJulxcoChnH4Su0xUZjxtJ1VXLxVwkXq

