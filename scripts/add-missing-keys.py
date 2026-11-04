#!/usr/bin/env python3
"""CMDP — إضافة المفاتيح الناقصة إلى القواميس الأربعة (en/fr/it/es).
المفاتيح هي سلاسل البيانات العربية (مهام، جهات، قوانين، فرص، مدن، أسماء...)
تُدرج قبل قوس إغلاق كل قاموس مع الحفاظ على التنسيق."""
import json

# key (بصيغة بايثون؛ \n حقيقية تُحوَّل إلى \\n في JS) → ترجمات
T = {
  # ─── الأشهر المغربية (الصيغة الكاملة من Intl ar-MA) ───
  "يناير": {"en": "January", "fr": "janvier", "it": "gennaio", "es": "enero"},
  "فبراير": {"en": "February", "fr": "février", "it": "febbraio", "es": "febrero"},
  "مارس": {"en": "March", "fr": "mars", "it": "marzo", "es": "marzo"},
  "أبريل": {"en": "April", "fr": "avril", "it": "aprile", "es": "abril"},
  "يونيو": {"en": "June", "fr": "juin", "it": "giugno", "es": "junio"},
  "يوليوز": {"en": "July", "fr": "juillet", "it": "luglio", "es": "julio"},
  "شتنبر": {"en": "September", "fr": "septembre", "it": "settembre", "es": "septiembre"},
  "أكتوبر": {"en": "October", "fr": "octobre", "it": "ottobre", "es": "octubre"},
  "نونبر": {"en": "November", "fr": "novembre", "it": "novembre", "es": "noviembre"},
  "دجنبر": {"en": "December", "fr": "décembre", "it": "dicembre", "es": "diciembre"},

  # ─── عناوين الالتزامات النظامية وأوصافها (لوحة القيادة) ───
  "عقد الجمع العام العادي السنوي 2026": {
    "en": "2026 annual ordinary general assembly",
    "fr": "Assemblée générale ordinaire annuelle 2026",
    "it": "Assemblea generale ordinaria annuale 2026",
    "es": "Asamblea general ordinaria anual 2026"},
  "عرض التقريرين الأدبي والمالي، المصادقة على الحسابات، وتجديد نصف أعضاء المجلس.": {
    "en": "Present the activity and financial reports, approve the accounts, and renew half of the board members.",
    "fr": "Présentation des rapports moral et financier, approbation des comptes et renouvellement de la moitié des membres du conseil.",
    "it": "Presentazione dei rapporti di attività e finanziario, approvazione dei conti e rinnovo della metà dei membri del consiglio.",
    "es": "Presentación de los informes de gestión y financiero, aprobación de las cuentas y renovación de la mitad de los miembros del consejo."},
  "إيداع محضر الجمع العام لدى السلطة المحلية": {
    "en": "Deposit the general assembly minutes with the local authority",
    "fr": "Dépôt du procès-verbal de l'assemblée générale auprès de l'autorité locale",
    "it": "Deposito del verbale dell'assemblea generale presso l'autorità locale",
    "es": "Depósito del acta de la asamblea general ante la autoridad local"},
  "داخل الأجل القانوني بعد انعقاد الجمع العام.": {
    "en": "Within the legal deadline after the general assembly is held.",
    "fr": "Dans le délai légal suivant la tenue de l'assemblée générale.",
    "it": "Entro il termine legale dopo lo svolgimento dell'assemblea generale.",
    "es": "Dentro del plazo legal tras la celebración de la asamblea general."},
  "تحديث المعطيات بالسجل المركزي (ODCO)": {
    "en": "Update records in the central register (ODCO)",
    "fr": "Mise à jour des données au registre central (ODCO)",
    "it": "Aggiornamento dei dati nel registro centrale (ODCO)",
    "es": "Actualización de los datos en el registro central (ODCO)"},
  "تحيين تركيبة المجلس والمقر الجديد بعد الجمع العام الاستثنائي.": {
    "en": "Update the board composition and the new head office after the extraordinary general assembly.",
    "fr": "Actualisation de la composition du conseil et du nouveau siège après l'assemblée générale extraordinaire.",
    "it": "Aggiornamento della composizione del consiglio e della nuova sede dopo l'assemblea generale straordinaria.",
    "es": "Actualización de la composición del consejo y de la nueva sede tras la asamblea general extraordinaria."},
  "التصريح السنوي بالضريبة المهنية 2027": {
    "en": "2027 annual professional tax declaration",
    "fr": "Déclaration annuelle de la taxe professionnelle 2027",
    "it": "Dichiarazione annuale dell'imposta professionale 2027",
    "es": "Declaración anual del impuesto profesional 2027"},
  "التصريح لدى المديرية العامة للضرائب.": {
    "en": "File the declaration with the General Directorate of Taxes.",
    "fr": "Déclaration auprès de la Direction Générale des Impôts.",
    "it": "Presentazione della dichiarazione presso la Direzione Generale delle Imposte.",
    "es": "Presentación de la declaración ante la Dirección General de Impuestos."},
  "التصريح السنوي لدى الضمان الاجتماعي": {
    "en": "Annual social security declaration",
    "fr": "Déclaration annuelle auprès de la sécurité sociale",
    "it": "Dichiarazione annuale alla previdenza sociale",
    "es": "Declaración anual ante la seguridad social"},
  "تصريح المستخدمات والأجراء لدى الصندوق الوطني للضمان الاجتماعي.": {
    "en": "Declare employees and workers with the National Social Security Fund.",
    "fr": "Déclaration des salariés et ouvriers auprès de la Caisse Nationale de Sécurité Sociale.",
    "it": "Dichiarazione di dipendenti e lavoratori presso il Fondo Nazionale di Previdenza Sociale.",
    "es": "Declaración de empleados y trabajadores ante el Fondo Nacional de Seguridad Social."},
  "إعداد الحسابات السنوية لسنة 2026": {
    "en": "Prepare the 2026 annual accounts",
    "fr": "Établissement des comptes annuels 2026",
    "it": "Redazione dei conti annuali 2026",
    "es": "Elaboración de las cuentas anuales de 2026"},
  "إعداد الحسابات وإخضاعها لمراقبة مراقب الحسابات قبل الجمع العام.": {
    "en": "Prepare the accounts and submit them to the statutory auditor before the general assembly.",
    "fr": "Établissement des comptes et soumission au commissaire aux comptes avant l'assemblée générale.",
    "it": "Redazione dei conti e sottoposizione al revisore legale prima dell'assemblea generale.",
    "es": "Elaboración de las cuentas y sometimiento al auditor de cuentas antes de la asamblea general."},
  "تجديد عقد كراء المحل": {
    "en": "Renew the premises lease contract",
    "fr": "Renouvellement du contrat de bail du local",
    "it": "Rinnovo del contratto di locazione del locale",
    "es": "Renovación del contrato de arrendamiento del local"},
  "تفاوض شروط الكراء السنوي مع المالك.": {
    "en": "Negotiate the annual lease terms with the owner.",
    "fr": "Négociation des conditions du bail annuel avec le propriétaire.",
    "it": "Negoziazione delle condizioni dell'affitto annuale con il proprietario.",
    "es": "Negociación de las condiciones del alquiler anual con el propietario."},
  "التصريح بالضريبة المهنية 2026": {
    "en": "2026 professional tax declaration",
    "fr": "Déclaration de la taxe professionnelle 2026",
    "it": "Dichiarazione dell'imposta professionale 2026",
    "es": "Declaración del impuesto profesional 2026"},
  "تم الإيداع في الأجل.": {
    "en": "Filed within the deadline.",
    "fr": "Déposée dans les délais.",
    "it": "Presentata entro i termini.",
    "es": "Presentada dentro del plazo."},

  # ─── الجهات الحكومية والوصية ───
  "كتابة الدولة المكلفة بالصناعة التقليدية والاقتصاد الاجتماعي والتضامني": {
    "en": "Secretary of State for Traditional Industry, Social and Solidarity Economy",
    "fr": "Secrétariat d'État chargé de l'Artisanat, de l'Économie Sociale et Solidaire",
    "it": "Segreteria di Stato per l'Artigianato, l'Economia Sociale e Solidale",
    "es": "Secretaría de Estado de Artesanía, Economía Social y Solidaria"},
  "الحكومة": {"en": "The Government", "fr": "Le Gouvernement", "it": "Il Governo", "es": "El Gobierno"},
  "إعداد وتنفيذ السياسة الحكومية في مجال الاقتصاد الاجتماعي والتضامني\nتأطير ودعم التعاونيات والصناعة التقليدية\nتنزيل البرامج الوطنية لدعم القطاع التعاوني": {
    "en": "Designing and implementing government policy on the social and solidarity economy\nFraming and supporting cooperatives and traditional crafts\nRolling out national programmes in support of the cooperative sector",
    "fr": "Élaboration et mise en œuvre de la politique gouvernementale en matière d'économie sociale et solidaire\nEncadrement et appui aux coopératives et à l'artisanat\nDéploiement des programmes nationaux d'appui au secteur coopératif",
    "it": "Elaborazione e attuazione della politica di governo sull'economia sociale e solidale\nQuadro normativo e sostegno alle cooperative e all'artigianato\nAttuazione dei programmi nazionali a sostegno del settore cooperativo",
    "es": "Elaboración y ejecución de la política gubernamental en materia de economía social y solidaria\nMarco de apoyo a las cooperativas y la artesanía\nDespliegue de los programas nacionales de apoyo al sector cooperativo"},
  "الصندوق الوطني للضمان الاجتماعي": {
    "en": "National Social Security Fund (CNSS)",
    "fr": "Caisse Nationale de Sécurité Sociale (CNSS)",
    "it": "Fondo Nazionale di Previdenza Sociale (CNSS)",
    "es": "Fondo Nacional de Seguridad Social (CNSS)"},
  "وزارة الشغل والإدماج المهني": {
    "en": "Ministry of Employment and Professional Integration",
    "fr": "Ministère de l'Emploi et de l'Insertion Professionnelle",
    "it": "Ministero del Lavoro e dell'Inserimento Professionale",
    "es": "Ministerio de Empleo e Inserción Profesional"},
  "تصريح وتغطية الأجراء والمستخدمين العاملين لدى التعاونيات\nتسلم شهادات الانخراط والمستخرجات\nتحصيل المساهمات الاجتماعية": {
    "en": "Declaring and providing coverage for employees and workers at cooperatives\nIssuing membership certificates and statements\nCollecting social contributions",
    "fr": "Déclaration et couverture des salariés employés par les coopératives\nDélivrance des attestations d'affiliation et des extraits\nRecouvrement des cotisations sociales",
    "it": "Dichiarazione e copertura dei dipendenti delle cooperative\nRilascio dei certificati di iscrizione e degli estratti\nRiscossione dei contributi previdenziali",
    "es": "Declaración y cobertura de los asalariados empleados por las cooperativas\nEmisión de certificados de afiliación y extractos\nRecaudación de las cotizaciones sociales"},
  "وضع وتنفيذ السياسة الفلاحية والبرامج الداعمة\nدعم التعاونيات الفلاحية عبر برامج الغرس والتجهيز والتسويق\nالتحفيز على التنظيم الجماعي للمنتجين": {
    "en": "Setting and implementing agricultural policy and support programmes\nSupporting agricultural cooperatives through planting, equipment and marketing programmes\nEncouraging collective organisation among producers",
    "fr": "Définition et mise en œuvre de la politique agricole et des programmes d'appui\nSoutien aux coopératives agricoles via les programmes de plantation, d'équipement et de commercialisation\nIncitation à l'organisation collective des producteurs",
    "it": "Definizione e attuazione della politica agricola e dei programmi di sostegno\nSostegno alle cooperative agricole tramite programmi di impianto, dotazione di attrezzature e commercializzazione\nIncentivo all'organizzazione collettiva dei produttori",
    "es": "Definición y ejecución de la política agrícola y los programas de apoyo\nApoyo a las cooperativas agrícolas mediante programas de plantación, equipamiento y comercialización\nFomento de la organización colectiva de los productores"},

  # ─── النصوص القانونية (المرسوم 2.15.617، مبادئ ICA، توصية ILO) ───
  "المرسوم رقم 2.15.617 بتحديد قواعد تنظيم وتسيير سجل التعاونيات": {
    "en": "Decree No. 2.15.617 setting the rules for organising and managing the cooperative register",
    "fr": "Décret n° 2.15.617 fixant les règles d'organisation et de gestion du registre des coopératives",
    "it": "Decreto n. 2.15.617 recante le norme di organizzazione e gestione del registro delle cooperative",
    "es": "Decreto n.º 2.15.617 por el que se fijan las normas de organización y gestión del registro de cooperativas"},
  "الحكومة — صادر في 24 مارس 2016 (الجريدة الرسمية عدد 6455 بتاريخ 11 أبريل 2016)": {
    "en": "The Government — issued on 24 March 2016 (Official Gazette No. 6455 of 11 April 2016)",
    "fr": "Le Gouvernement — publié le 24 mars 2016 (Bulletin Officiel n° 6455 du 11 avril 2016)",
    "it": "Il Governo — emanato il 24 marzo 2016 (Gazzetta Ufficiale n. 6455 dell'11 aprile 2016)",
    "es": "El Gobierno — emitido el 24 de marzo de 2016 (Boletín Oficial n.º 6455 de 11 de abril de 2016)"},
  "يحدد قواعد تنظيم وتسيير السجل المركزي والسجلات المحلية للتعاونيات، وكيفيات التقييد والتقييدات المعدلة والتشطيب.": {
    "en": "Sets the rules for organising and managing the central register and local cooperative registers, as well as the procedures for registration, amendments and cancellation.",
    "fr": "Fixe les règles d'organisation et de gestion du registre central et des registres locaux des coopératives, ainsi que les modalités d'immatriculation, des inscriptions modificatives et de la radiation.",
    "it": "Stabilisce le norme di organizzazione e gestione del registro centrale e dei registri locali delle cooperative, nonché le modalità di iscrizione, delle modifiche e della cancellazione.",
    "es": "Fija las normas de organización y gestión del registro central y de los registros locales de cooperativas, así como los procedimientos de inscripción, modificaciones y cancelación."},
  "تحديد كيفيات التقييد بالسجل المحلي لدى كتابة ضبط المحكمة الابتدائية": {
    "en": "Defining the registration procedures in the local register held by the district court registry",
    "fr": "Définition des modalités d'immatriculation au registre local auprès du greffe du tribunal de première instance",
    "it": "Definizione delle modalità di iscrizione nel registro locale presso la cancelleria del tribunale di primo grado",
    "es": "Definición de los procedimientos de inscripción en el registro local ante la secretaría del juzgado de primera instancia"},
  "آجال إحالة الملفات من السلطة المحلية على مكتب تنمية التعاون للتقييد بالسجل المركزي": {
    "en": "Deadlines for forwarding files from the local authority to the Cooperative Development Office for entry in the central register",
    "fr": "Délais de transmission des dossiers de l'autorité locale à l'Office de Développement de la Coopération pour inscription au registre central",
    "it": "Termini di trasmissione dei fascicoli dall'autorità locale all'Ufficio di Sviluppo della Cooperazione per l'iscrizione nel registro centrale",
    "es": "Plazos de remisión de los expedientes de la autoridad local a la Oficina de Desarrollo de la Cooperación para su inscripción en el registro central"},
  "مضمون بطاقات التسجيل والمستخرجات المسلمة للأعضاء والغير": {
    "en": "Content of the registration cards and extracts issued to members and third parties",
    "fr": "Contenu des cartes d'immatriculation et des extraits délivrés aux membres et aux tiers",
    "it": "Contenuto delle tessere di iscrizione e degli estratti rilasciati ai soci e ai terzi",
    "es": "Contenido de las tarjetas de inscripción y de los extractos emitidos a los socios y a terceros"},
  "مبادئ التعاون السبعة — التحالف التعاوني الدولي": {
    "en": "The seven cooperative principles — International Cooperative Alliance",
    "fr": "Les sept principes coopératifs — Alliance Coopérative Internationale",
    "it": "I sette principi cooperativi — Alleanza Cooperativa Internazionale",
    "es": "Los siete principios cooperativos — Alianza Cooperativa Internacional"},
  "التحالف التعاوني الدولي (ICA) — مانشستر 1995": {
    "en": "International Cooperative Alliance (ICA) — Manchester 1995",
    "fr": "Alliance Coopérative Internationale (ICA) — Manchester 1995",
    "it": "Alleanza Cooperativa Internazionale (ICA) — Manchester 1995",
    "es": "Alianza Cooperativa Internacional (ICA) — Mánchester 1995"},
  "المرجعية العالمية لقيم التعاون التي تلتزم بها التعاونيات المنضوية تحت التحالف، وتشكل جوهر الهوية التعاونية.": {
    "en": "The global reference for cooperative values upheld by alliance member cooperatives, forming the core of cooperative identity.",
    "fr": "La référence mondiale des valeurs coopératives auxquelles adhèrent les coopératives membres de l'Alliance, et qui constituent l'essence de l'identité coopérative.",
    "it": "Il riferimento mondiale dei valori cooperativi cui aderiscono le cooperative membri dell'Alleanza, e che costituiscono l'essenza dell'identità cooperativa.",
    "es": "La referencia mundial de los valores cooperativos que asumen las cooperativas miembros de la Alianza, y que constituyen la esencia de la identidad cooperativa."},
  "العضوية الطوعية والمفتوحة": {
    "en": "Voluntary and open membership",
    "fr": "Adhésion volontaire et ouverte à tous",
    "it": "Adesione volontaria e aperta",
    "es": "Adhesión voluntaria y abierta"},
  "الرقابة الديمقراطية من طرف الأعضاء": {
    "en": "Democratic member control",
    "fr": "Contrôle démocratique par les membres",
    "it": "Controllo democratico dei soci",
    "es": "Control democrático por los socios"},
  "المشاركة الاقتصادية للأعضاء": {
    "en": "Member economic participation",
    "fr": "Participation économique des membres",
    "it": "Partecipazione economica dei soci",
    "es": "Participación económica de los socios"},
  "الاستقلالية والحياد": {
    "en": "Autonomy and independence",
    "fr": "Autonomie et indépendance",
    "it": "Autonomia e indipendenza",
    "es": "Autonomía e independencia"},
  "التربية والتكوين والمعلومات": {
    "en": "Education, training and information",
    "fr": "Éducation, formation et information",
    "it": "Educazione, formazione e informazione",
    "es": "Educación, formación e información"},
  "التعاون فيما بين التعاونيات": {
    "en": "Cooperation among cooperatives",
    "fr": "Coopération entre les coopératives",
    "it": "Cooperazione tra cooperative",
    "es": "Cooperación entre cooperativas"},
  "الاهتمام بالمجتمع المحلي": {
    "en": "Concern for community",
    "fr": "Engagement envers la communauté",
    "it": "Attenzione alla comunità",
    "es": "Compromiso con la comunidad"},
  "توصية منظمة العمل الدولية رقم 193 بشأن تعزيز التعاونيات": {
    "en": "ILO Recommendation No. 193 on the promotion of cooperatives",
    "fr": "Recommandation n° 193 de l'OIT sur la promotion des coopératives",
    "it": "Raccomandazione n. 193 dell'OIL sulla promozione delle cooperative",
    "es": "Recomendación n.º 193 de la OIT sobre la promoción de las cooperativas"},
  "منظمة العمل الدولية (ILO)": {
    "en": "International Labour Organization (ILO)",
    "fr": "Organisation Internationale du Travail (OIT)",
    "it": "Organizzazione Internazionale del Lavoro (OIL)",
    "es": "Organización Internacional del Trabajo (OIT)"},
  "توصية دولية تدعو الدول الأعضاء إلى تهيئة بيئة قانونية ومؤسساتية مواتية لتطور التعاونيات وإدماجها في السياسات الوطنية للتنمية والتشغيل.": {
    "en": "An international recommendation calling on member states to foster a favourable legal and institutional environment for the development of cooperatives and their integration into national development and employment policies.",
    "fr": "Une recommandation internationale invitant les États membres à instaurer un environnement juridique et institutionnel favorable au développement des coopératives et à leur intégration dans les politiques nationales de développement et d'emploi.",
    "it": "Una raccomandazione internazionale che invita gli Stati membri a creare un ambiente giuridico e istituzionale favorevole allo sviluppo delle cooperative e alla loro integrazione nelle politiche nazionali di sviluppo e occupazione.",
    "es": "Una recomendación internacional que insta a los Estados miembros a crear un entorno jurídico e institucional favorable al desarrollo de las cooperativas y a su integración en las políticas nacionales de desarrollo y empleo."},
  "تمكين التعاونيات من الاستفادة من السياسات الداعمة": {
    "en": "Enabling cooperatives to benefit from support policies",
    "fr": "Permettre aux coopératives de bénéficier des politiques d'appui",
    "it": "Consentire alle cooperative di beneficiare delle politiche di sostegno",
    "es": "Permitir que las cooperativas se beneficien de las políticas de apoyo"},
  "توفير التكوين والمعلومات للأعضاء": {
    "en": "Providing training and information to members",
    "fr": "Offrir formation et information aux membres",
    "it": "Fornire formazione e informazione ai soci",
    "es": "Proporcionar formación e información a los socios"},
  "تشجيع التعاون بين التعاونيات عبر الوطنية": {
    "en": "Encouraging cross-border cooperation among cooperatives",
    "fr": "Encourager la coopération transfrontalière entre coopératives",
    "it": "Incoraggiare la cooperazione transfrontaliera tra cooperative",
    "es": "Fomentar la cooperación transfronteriza entre cooperativas"},

  # ─── الفرص: العناوين والأوصاف والشروط ───
  "مسؤول(ة) التسويق الرقمي": {
    "en": "Digital marketing officer",
    "fr": "Responsable du marketing digital",
    "it": "Responsabile del marketing digitale",
    "es": "Responsable de marketing digital"},
  "تدبير الحضور الرقمي للتعاونية: متاجر إلكترونية، شبكات التواصل، وتتبع الطلبات الوطنية والدولية لزيت أركان البيولوجي المعتمد.": {
    "en": "Manage the cooperative's digital presence: e-commerce shops, social networks, and tracking national and international orders for certified organic argan oil.",
    "fr": "Gérer la présence numérique de la coopérative : boutiques en ligne, réseaux sociaux et suivi des commandes nationales et internationales d'huile d'argan biologique certifiée.",
    "it": "Gestire la presenza digitale della cooperativa: negozi online, social network e tracciamento degli ordini nazionali e internazionali di olio di argan biologico certificato.",
    "es": "Gestionar la presencia digital de la cooperativa: tiendas en línea, redes sociales y seguimiento de los pedidos nacionales e internacionales de aceite de argán ecológico certificado."},
  "شهادة في التسويق أو التجارة • خبرة سنة على الأقل في التجارة الإلكترونية • إتقان الفرنسية والعربية": {
    "en": "Degree in marketing or commerce • At least one year of experience in e-commerce • Fluency in French and Arabic",
    "fr": "Diplôme en marketing ou commerce • Au moins un an d'expérience en commerce électronique • Maîtrise du français et de l'arabe",
    "it": "Laurea in marketing o commercio • Almeno un anno di esperienza nel commercio elettronico • Padronanza di francese e arabo",
    "es": "Titulación en marketing o comercio • Al menos un año de experiencia en comercio electrónico • Dominio del francés y el árabe"},
  "طلب خدمة: مراجعة محاسبية للحسابات السنوية": {
    "en": "Service request: audit of the annual accounts",
    "fr": "Demande de service : révision comptable des comptes annuels",
    "it": "Richiesta di servizio: revisione contabile dei conti annuali",
    "es": "Solicitud de servicio: auditoría de las cuentas anuales"},
  "التعاونية تبحث عن مكتب محاسبة معتمد لمراجعة الحسابات السنوية 2026 وإعداد التصريحات الجبائية.": {
    "en": "The cooperative is looking for a certified accounting firm to audit the 2026 annual accounts and prepare tax declarations.",
    "fr": "La coopérative recherche un cabinet comptable agréé pour réviser les comptes annuels 2026 et préparer les déclarations fiscales.",
    "it": "La cooperativa cerca uno studio contabile certificato per la revisione dei conti annuali 2026 e la preparazione delle dichiarazioni fiscali.",
    "es": "La cooperativa busca una asesoría contable certificada para auditar las cuentas anuales de 2026 y preparar las declaraciones fiscales."},
  "محاسب قانوني معتمد • تجربة مع التعاونيات أو منظمات الاقتصاد الاجتماعي": {
    "en": "Certified public accountant • Experience with cooperatives or social economy organisations",
    "fr": "Expert-comptable agréé • Expérience avec les coopératives ou les organisations de l'économie sociale",
    "it": "Commercialista iscritto all'albo • Esperienza con cooperative o organizzazioni dell'economia sociale",
    "es": "Contable colegiado certificado • Experiencia con cooperativas u organizaciones de la economía social"},
  "حرفي(ة) نسيج أمازيغي — 3 مناصب": {
    "en": "Amazigh weaving craftsperson — 3 positions",
    "fr": "Artisan(e) tisserand(e) amazigh — 3 postes",
    "it": "Artigiano/a tessitore amazigh — 3 posizioni",
    "es": "Artesano/a tejedor/a amazigh — 3 puestos"},
  "تشغيل حرفيين متمكنين من النسج التقليدي بالأصواف الطبيعية للعمل بورشة التعاونية بأسني، مع إمكانية التكوين المستمر.": {
    "en": "Hiring skilled craftspeople in traditional weaving with natural wool to work at the cooperative's workshop in Asni, with opportunities for ongoing training.",
    "fr": "Recrutement d'artisans maîtrisant le tissage traditionnel en laine naturelle pour l'atelier de la coopérative à Asni, avec possibilité de formation continue.",
    "it": "Assunzione di artigiani esperti nella tessitura tradizionale con lane naturali per il laboratorio della cooperativa ad Asni, con possibilità di formazione continua.",
    "es": "Contratación de artesanos expertos en tejido tradicional con lanas naturales para el taller de la cooperativa en Asni, con posibilidad de formación continua."},
  "إتقان techniques النسج اليدوي • الانضباط والقدرة على العمل الجماعي": {
    "en": "Mastery of hand-weaving techniques • Discipline and ability to work in a team",
    "fr": "Maîtrise des techniques de tissage à la main • Discipline et capacité de travail en équipe",
    "it": "Padronanza delle tecniche di tessitura a mano • Disciplina e capacità di lavorare in team",
    "es": "Dominio de las técnicas de tejido a mano • Disciplina y capacidad de trabajo en equipo"},
  "فرصة تعاقد: أشغال زليج لترميم RIAD تاريخي": {
    "en": "Contract opportunity: zellige work for the restoration of a historic riad",
    "fr": "Opportunité de contrat : travaux de zellige pour la restauration d'un riad historique",
    "it": "Opportunità di contratto: lavori di zellige per il restauro di un riad storico",
    "es": "Oportunidad de contratación: trabajos de zellige para la restauración de un riad histórico"},
  "تعاونية دار الزليج تبحث عن مقاول منفذ لأشغال الزليج والجبس ضمن مشروع ترميم رياض تاريخي بالمدينة العتيقة لفاس — 400 متر مربع.": {
    "en": "Dar Zellij Cooperative is looking for a contractor to carry out zellige and plaster work as part of a project to restore a historic riad in the old medina of Fez — 400 square metres.",
    "fr": "La coopérative Dar Zellij recherche un entrepreneur pour exécuter les travaux de zellige et de plâtre dans le cadre de la restauration d'un riad historique dans la médina de Fès — 400 mètres carrés.",
    "it": "La cooperativa Dar Zellij cerca un'impresa per eseguire i lavori di zellige e stucco nell'ambito del restauro di un riad storico nella medina di Fès — 400 metri quadrati.",
    "es": "La cooperativa Dar Zellij busca un contratista para ejecutar los trabajos de zellige y yeso dentro del proyecto de restauración de un riad histórico en la medina de Fez — 400 metros cuadrados."},
  "تجربة في الترميم المعماري التقليدي • فريق عمل مؤهل • جهاز تقني": {
    "en": "Experience in traditional architectural restoration • Qualified team • Technical equipment",
    "fr": "Expérience en restauration architecturale traditionnelle • Équipe qualifiée • Équipement technique",
    "it": "Esperienza nel restauro architettonico tradizionale • Squadra qualificata • Attrezzatura tecnica",
    "es": "Experiencia en restauración arquitectónica tradicional • Equipo cualificado • Equipo técnico"},
  "شراكة توزيع: تمور المجول والدقلة النور": {
    "en": "Distribution partnership: Mejhoul and Deglet Nour dates",
    "fr": "Partenariat de distribution : dattes Mejhoul et Deglet Nour",
    "it": "Partnership di distribuzione: datteri Mejhoul e Deglet Nour",
    "es": "Alianza de distribución: dátiles Mejhoul y Deglet Nour"},
  "بحث عن موزعين وشركاء تجاريين لتسويق منتوجات التعاونية الموضبة داخل المدن الكبرى، مع عقود تزويد موسمية.": {
    "en": "Seeking distributors and commercial partners to market the cooperative's packaged products in major cities, with seasonal supply contracts.",
    "fr": "Recherche de distributeurs et partenaires commerciaux pour commercialiser les produits conditionnés de la coopérative dans les grandes villes, avec des contrats d'approvisionnement saisonniers.",
    "it": "Ricerca di distributori e partner commerciali per la commercializzazione dei prodotti confezionati della cooperativa nelle grandi città, con contratti di fornitura stagionali.",
    "es": "Búsqueda de distribuidores y socios comerciales para comercializar los productos envasados de la cooperativa en las grandes ciudades, con contratos de suministro estacionales."},
  "سجل تجاري ساري • شبكة توزيع نشيطة • القدرة اللوجستية على النقل المبرد": {
    "en": "Valid commercial registration • Active distribution network • Logistics capacity for refrigerated transport",
    "fr": "Registre de commerce en cours de validité • Réseau de distribution actif • Capacité logistique de transport réfrigéré",
    "it": "Registro commerciale in corso di validità • Rete di distribuzione attiva • Capacità logistica di trasporto refrigerato",
    "es": "Registro mercantil vigente • Red de distribución activa • Capacidad logística de transporte refrigerado"},
  "تقني(ة) وحدة التبريد والتلفيف": {
    "en": "Refrigeration and packaging unit technician",
    "fr": "Technicien(ne) de l'unité de réfrigération et de conditionnement",
    "it": "Tecnico/a dell'unità di refrigerazione e confezionamento",
    "es": "Técnico/a de la unidad de refrigeración y envasado"},
  "تشغيل تقني لتدبير وحدة التبريد والتلفيف بميناء الصويرة: صيانة المعدات، احترام معايير HACCP، وتتبع المخزون.": {
    "en": "Hiring a technician to manage the refrigeration and packaging unit at the Essaouira port: equipment maintenance, compliance with HACCP standards, and inventory tracking.",
    "fr": "Recrutement d'un technicien pour gérer l'unité de réfrigération et de conditionnement au port d'Essaouira : entretien des équipements, respect des normes HACCP et suivi des stocks.",
    "it": "Assunzione di un tecnico per gestire l'unità di refrigerazione e confezionamento al porto di Essaouira: manutenzione delle attrezzature, rispetto delle norme HACCP e gestione delle scorte.",
    "es": "Contratación de un técnico para gestionar la unidad de refrigeración y envasado en el puerto de Esauira: mantenimiento de equipos, cumplimiento de las normas HACCP y control de inventario."},
  "دبلوم تقني في التبريد أو الصناعات الغذائية • خبرة سنتين • عمل بنظام الحصص": {
    "en": "Technician diploma in refrigeration or food industries • Two years of experience • Shift-based work",
    "fr": "Diplôme de technicien en froid ou industries alimentaires • Deux ans d'expérience • Travail en horaires postés",
    "it": "Diploma di tecnico in refrigerazione o industrie alimentari • Due anni di esperienza • Lavoro a turni",
    "es": "Diploma de técnico en refrigeración o industrias alimentarias • Dos años de experiencia • Trabajo por turnos"},
  "طلب خدمة: تصميم هوية بصرية وشعار": {
    "en": "Service request: visual identity and logo design",
    "fr": "Demande de service : conception d'une identité visuelle et d'un logo",
    "it": "Richiesta di servizio: design di identità visiva e logo",
    "es": "Solicitud de servicio: diseño de identidad visual y logotipo"},
  "التعاونية بصدد تحديث هويتها البصرية وتحتاج مصمماً محترفاً لإنجاز شعار جديد ودليل الهوية البصرية.": {
    "en": "The cooperative is updating its visual identity and needs a professional designer to create a new logo and brand guidelines.",
    "fr": "La coopérative est en train de renouveler son identité visuelle et a besoin d'un designer professionnel pour créer un nouveau logo et un manuel d'identité.",
    "it": "La cooperativa sta rinnovando la propria identità visiva e ha bisogno di un designer professionista per creare un nuovo logo e un manuale d'identità.",
    "es": "La cooperativa está renovando su identidad visual y necesita un diseñador profesional para crear un nuevo logotipo y un manual de identidad."},
  "ملف أعمال (Portfolio) في الهوية البصرية • قدرة على العمل عن بعد": {
    "en": "Portfolio in visual identity • Ability to work remotely",
    "fr": "Portfolio en identité visuelle • Capacité à travailler à distance",
    "it": "Portfolio in identità visiva • Capacità di lavorare da remoto",
    "es": "Portafolio en identidad visual • Capacidad de trabajar en remoto"},
  "تدريب محاسبي — PFE": {
    "en": "Accounting internship — final-year project",
    "fr": "Stage comptable — PFE",
    "it": "Tirocinio contabile — tesi finale",
    "es": "Prácticas de contabilidad — PFE"},
  "استقبال طالب(ة) في مرحلة تكوين لإنجاز مشروع نهاية الدراس في المحاسبة والمالية داخل تعاونية سياحية بخميسات.": {
    "en": "Hosting a student for a training placement to complete an end-of-studies project in accounting and finance within a tourism cooperative in Khemisset.",
    "fr": "Accueil d'un(e) étudiant(e) en stage pour réaliser un projet de fin d'études en comptabilité et finance au sein d'une coopérative touristique à Khémisset.",
    "it": "Accoglienza di uno/a studente/ssa in tirocinio per la realizzazione di un progetto di fine studi in contabilità e finanza presso una cooperativa turistica a Khemisset.",
    "es": "Acogida de un/a estudiante en prácticas para realizar un proyecto de fin de estudios en contabilidad y finanzas en una cooperativa turística en Khemiset."},
  "مستوى السلك الثالث محاسبة/مالية • إتقان أدوات المعلوماتية المكتبية": {
    "en": "Bachelor's level in accounting/finance • Proficiency with office software",
    "fr": "Niveau licence en comptabilité/finance • Maîtrise des outils bureautiques",
    "it": "Livello triennale in contabilità/finanza • Padronanza degli strumenti informatici",
    "es": "Nivel de grado en contabilidad/finanzas • Dominio de las herramientas ofimáticas"},
  "فرصة تعاقد: مواكبة في الترقيم الرقمي": {
    "en": "Contract opportunity: digital transformation support",
    "fr": "Opportunité de contrat : accompagnement à la transformation numérique",
    "it": "Opportunità di contratto: supporto alla trasformazione digitale",
    "es": "Oportunidad de contratación: acompañamiento en la transformación digital"},
  "تعاونية الأصيلة للصناعة الغذائية تبحث عن مصفن رقمي لمواكبتها في رقمنة التسيير: فاتورة إلكترونية، مخزون، وتتبع الإنتاج.": {
    "en": "Assilah Food Industry Cooperative is looking for a digital expert to support its digitalisation: e-invoicing, inventory, and production tracking.",
    "fr": "La coopérative Al Assilah de l'industrie alimentaire recherche un expert numérique pour l'accompagner dans la digitalisation : facturation électronique, stock et suivi de production.",
    "it": "La cooperativa Al Assilah dell'industria alimentare cerca un esperto digitale per accompagnarla nella digitalizzazione: fatturazione elettronica, magazzino e tracciamento della produzione.",
    "es": "La cooperativa Al Assilah de la industria alimentaria busca un experto digital para acompañarla en la digitalización: facturación electrónica, inventario y seguimiento de la producción."},
  "تجربة في رقمنة المقاولات الصغيرة • معرفة بمنظومات ERP": {
    "en": "Experience in digitalising small businesses • Knowledge of ERP systems",
    "fr": "Expérience dans la digitalisation des petites entreprises • Connaissance des systèmes ERP",
    "it": "Esperienza nella digitalizzazione delle piccole imprese • Conoscenza dei sistemi ERP",
    "es": "Experiencia en la digitalización de pequeñas empresas • Conocimiento de sistemas ERP"},
  "طلب خدمة: تكوين في التقنيات المتقدمة للتوضيب": {
    "en": "Service request: training in advanced packaging techniques",
    "fr": "Demande de service : formation aux techniques avancées de conditionnement",
    "it": "Richiesta di servizio: formazione sulle tecniche avanzate di confezionamento",
    "es": "Solicitud de servicio: formación en técnicas avanzadas de envasado"},
  "التعاونية تروم تكوين 12 منخرطة على التقنيات المتقدمة في توضيب وتلفيف المنتجات التجميلية الطبيعية.": {
    "en": "The cooperative aims to train 12 women members in advanced techniques for packaging natural cosmetic products.",
    "fr": "La coopérative vise à former 12 adhérentes aux techniques avancées de conditionnement des produits cosmétiques naturels.",
    "it": "La cooperativa intende formare 12 socie sulle tecniche avanzate di confezionamento dei prodotti cosmetici naturali.",
    "es": "La cooperativa tiene como objetivo formar a 12 socias en técnicas avanzadas de envasado de productos cosméticos naturales."},
  "مكوِّن(ة) معتمد(ة) في التوضيب التجميلي • منهجية عملية": {
    "en": "Certified trainer in cosmetic packaging • Practical methodology",
    "fr": "Formateur(trice) certifié(e) en conditionnement cosmétique • Méthodologie pratique",
    "it": "Formatore/formatrice certificato/a nel confezionamento cosmetico • Metodologia pratica",
    "es": "Formador/a certificado/a en envasado cosmético • Metodología práctica"},

  # ─── مدن وأسماء تعاونيات وشركات (العرض التجريبي) ───
  "سطات": {"en": "Settat", "fr": "Settat", "it": "Settat", "es": "Settat"},
  "خميسات": {"en": "Khemisset", "fr": "Khémisset", "it": "Khemisset", "es": "Khemisset"},
  "الأصيلة": {"en": "Assilah", "fr": "Assilah", "it": "Assilah", "es": "Asilah"},
  "تعاونية سياحة أطلس المتوسط": {
    "en": "Atlas Mediterranean Tourism Cooperative",
    "fr": "Coopérative de Tourisme Atlas Méditerranée",
    "it": "Cooperativa Turistica Atlante Mediterraneo",
    "es": "Cooperativa de Turismo Atlas Mediterráneo"},
  "تعاونية الأصيلة للصناعة الغذائية": {
    "en": "Assilah Food Industry Cooperative",
    "fr": "Coopérative Al Assilah de l'Industrie Alimentaire",
    "it": "Cooperativa Al Assilah dell'Industria Alimentare",
    "es": "Cooperativa Al Assilah de la Industria Alimentaria"},
  "تعاونية خبير صوامة للتوضيب التجميلي": {
    "en": "Khebir Souamaa Cosmetic Packaging Cooperative",
    "fr": "Coopérative Khebir Souamaa de Conditionnement Cosmétique",
    "it": "Cooperativa Khebir Souamaa di Confezionamento Cosmetico",
    "es": "Cooperativa Khebir Souamaa de Envasado Cosmético"},
  "طاريق الشويكة": {"en": "Tarik Chouika", "fr": "Tarik Chouika", "it": "Tarik Chouika", "es": "Tarik Chouika"},
  "مدير المنصة": {
    "en": "Platform administrator",
    "fr": "Administrateur de la plateforme",
    "it": "Amministratore della piattaforma",
    "es": "Administrador de la plataforma"},
  "شركة وافي للتغليف": {
    "en": "Wafi Packaging Company",
    "fr": "Société Wafi d'Emballage",
    "it": "Wafi Imballaggi S.r.l.",
    "es": "Empresa Wafi de Envases"},
  "مؤسسة النخيل للتسويق": {
    "en": "Nakhil Marketing Establishment",
    "fr": "Établissement Nakhil de Commercialisation",
    "it": "Nakhil Marketing S.r.l.",
    "es": "Establecimiento Nakhil de Comercialización"},
  "مكتب الدراسات أفق": {
    "en": "Horizon Studies Office",
    "fr": "Bureau d'Études Horizon",
    "it": "Studio di Consulenza Horizon",
    "es": "Oficina de Estudios Horizon"},
  "مليكة أوعلي": {"en": "Malika Ouali", "fr": "Malika Ouali", "it": "Malika Ouali", "es": "Malika Ouali"},
  "يوسف المرابط": {"en": "Youssef El Mrabet", "fr": "Youssef El Mrabet", "it": "Youssef El Mrabet", "es": "Youssef El Mrabet"},
  "نعيمة الصنهاجي": {"en": "Naima Essanhaji", "fr": "Naïma Essanhaji", "it": "Naima Essanhaji", "es": "Naima Essanhaji"},
  "حفيظة الإدريسي": {"en": "Hafida El Idrissi", "fr": "Hafida El Idrissi", "it": "Hafida El Idrissi", "es": "Hafida El Idrissi"},

  # ─── رسائل التقديم والملاحظات ───
  "خبرة 5 سنوات في التسويق الرقمي للمنتجات المجالية، ورغبة في المساهمة في تطوير مبيعات التعاونية إلكترونياً.": {
    "en": "Five years' experience in digital marketing of local products, and a wish to help develop the cooperative's online sales.",
    "fr": "Cinq ans d'expérience en marketing digital de produits du terroir, et le souhait de contribuer au développement des ventes en ligne de la coopérative.",
    "it": "Cinque anni di esperienza nel marketing digitale di prodotti locali, e il desiderio di contribuire allo sviluppo delle vendite online della cooperativa.",
    "es": "Cinco años de experiencia en marketing digital de productos locales, y el deseo de contribuir al desarrollo de las ventas en línea de la cooperativa."},
  "شراكة لتوزيع التمور الموضبة داخل المراكز التجارية الكبرى بالدار البيضاء والرباط.": {
    "en": "Partnership to distribute packaged dates in major shopping centres in Casablanca and Rabat.",
    "fr": "Partenariat pour la distribution des dattes conditionnées dans les grands centres commerciaux de Casablanca et Rabat.",
    "it": "Partnership per la distribuzione di datteri confezionati nei grandi centri commerciali di Casablanca e Rabat.",
    "es": "Alianza para distribuir dátiles envasados en los grandes centros comerciales de Casablanca y Rabat."},
  "حرفية في النسج الأمازيغي، أرغب في الانخراط لنقل مهاراتي للعنصر النسائية الجدد.": {
    "en": "A craftswoman in Amazigh weaving, I would like to join to pass my skills on to the new women members.",
    "fr": "Artisane du tissage amazigh, je souhaite adhérer pour transmettre mes savoir-faire aux nouvelles adhérentes.",
    "it": "Artigiana della tessitura amazigh, vorrei iscrivermi per trasmettere le mie competenze alle nuove socie.",
    "es": "Artesana del tejido amazigh, deseo incorporarme para transmitir mis habilidades a las nuevas socias."},
  "تمت المصادقة في اجتماع المجلس.": {
    "en": "Approved at the board meeting.",
    "fr": "Approuvée lors de la réunion du conseil.",
    "it": "Approvata nella riunione del consiglio.",
    "es": "Aprobada en la reunión del consejo."},
  "مواكبة في إعداد دفتر التكاليف وملفات الصفقات العمومية.": {
    "en": "Support in preparing the specifications book and public procurement files.",
    "fr": "Accompagnement pour l'élaboration du cahier des charges et des dossiers de marchés publics.",
    "it": "Supporto nella redazione del capitolato e dei fascicoli di gara pubblica.",
    "es": "Apoyo en la elaboración del pliego de condiciones y los expedientes de contratación pública."},
  "سبق التعاقد مع مكتب آخر لهذه المهمة.": {
    "en": "Another firm was previously contracted for this task.",
    "fr": "Un autre cabinet a déjà été contracté pour cette mission.",
    "it": "Un altro studio era già stato incaricato per questo compito.",
    "es": "Otra empresa fue contratada previamente para esta tarea."},
  "خبرة 5 سنوات في التسويق الرقمي للمنتجات المجالية، وأنجزت حملات ناجحة لعلامات أركان.": {
    "en": "Five years' experience in digital marketing of local products, having run successful campaigns for argan brands.",
    "fr": "Cinq ans d'expérience en marketing digital de produits du terroir, avec des campagnes réussies pour des marques d'argan.",
    "it": "Cinque anni di esperienza nel marketing digitale di prodotti locali, con campagne di successo per marchi di argan.",
    "es": "Cinco años de experiencia en marketing digital de productos locales, con campañas exitosas para marcas de argán."},
  "مسؤول تسويق رقمي سابق بشركة توزيع بأكادير": {
    "en": "Former digital marketing manager at a distribution company in Agadir",
    "fr": "Ancien responsable marketing digital dans une société de distribution à Agadir",
    "it": "Ex responsabile marketing digitale in un'azienda di distribuzione ad Agadir",
    "es": "Ex responsable de marketing digital en una empresa de distribución en Agadir"},
  "حرفية نسج منذ 12 سنة، أتقن النسج المسطح واليدوي.": {
    "en": "Weaving craftswoman for 12 years, skilled in both flat and hand weaving.",
    "fr": "Artisane tisserande depuis 12 ans, maîtrisant le tissage à plat et le tissage à la main.",
    "it": "Artigiana tessitrice da 12 anni, esperta sia nella tessitura piatta che a mano.",
    "es": "Artesana tejedora desde hace 12 años, dominando el tejido plano y a mano."},
  "ورشة منزلية للنسيج بمراكش": {
    "en": "Home weaving workshop in Marrakesh",
    "fr": "Atelier de tissage à domicile à Marrakech",
    "it": "Laboratorio di tessitura domestico a Marrakech",
    "es": "Taller de tejido doméstico en Marrakech"},
  "فريق مؤهل في أشغال الترميم التقليدي وتعامل سابق مع معالم مصنفة.": {
    "en": "Qualified team in traditional restoration work, with prior experience on listed heritage buildings.",
    "fr": "Équipe qualifiée en travaux de restauration traditionnelle, ayant déjà travaillé sur des monuments classés.",
    "it": "Squadra qualificata nei lavori di restauro tradizionale, con precedente esperienza su monumenti vincolati.",
    "es": "Equipo cualificado en trabajos de restauración tradicional, con experiencia previa en monumentos catalogados."},
  "ترميم زليج بقصر الباهية جزئياً": {
    "en": "Partial zellige restoration at the Bahia Palace",
    "fr": "Restauration partielle du zellige du Palais Bahia",
    "it": "Restauro parziale dello zellige del Palazzo Bahia",
    "es": "Restauración parcial del zellige del Palacio Bahía"},
  "شبكة توزيع تغطي الدار البيضاء والرباط مع أسطول مبرد.": {
    "en": "Distribution network covering Casablanca and Rabat with a refrigerated fleet.",
    "fr": "Réseau de distribution couvrant Casablanca et Rabat avec une flotte réfrigérée.",
    "it": "Rete di distribuzione che copre Casablanca e Rabat con flotta refrigerata.",
    "es": "Red de distribución que cubre Casablanca y Rabat con flota refrigerada."},
  "توزيع تمور لثلاث علامات جهوية": {
    "en": "Date distribution for three regional brands",
    "fr": "Distribution de dattes pour trois marques régionales",
    "it": "Distribuzione di datteri per tre marchi regionali",
    "es": "Distribución de dátiles para tres marcas regionales"},
}

def js_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

FILES = {"en": "src/lib/i18n/en.ts", "fr": "src/lib/i18n/fr.ts", "it": "src/lib/i18n/it.ts", "es": "src/lib/i18n/es.ts"}
CONSTS = {"en": "EN", "fr": "FR", "it": "IT", "es": "ES"}

total_added = 0
for lang, path in FILES.items():
    code = open(path, encoding="utf-8").read()
    existing_keys = set()
    import re
    for m in re.finditer(r'^\s*"((?:\\.|[^"\\])*)":', code, re.M):
        existing_keys.add(m.group(1).replace("\\n", "\n").replace('\\"', '"'))
    added = skipped = 0
    lines = []
    for key, trans in T.items():
        if key in existing_keys:
            skipped += 1
            continue
        val = trans[lang]
        lines.append(f'  "{js_escape(key)}": "{js_escape(val)}",')
        added += 1
    if lines:
        # الإدراج قبل آخر قوس }
        idx = code.rstrip().rfind("};")
        code = code[:idx] + "\n" + "\n".join(lines) + "\n" + code[idx:]
        open(path, "w", encoding="utf-8").write(code)
    print(f"{lang.upper()}: added {added}, skipped (already present) {skipped}")
    total_added += added

print(f"\nTOTAL entries added: {total_added}")
print(f"Keys in translation table: {len(T)}")
