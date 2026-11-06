// ═══════════════════════════════════════════════════════════════════════════
// CMDP — ودجت المساعد الألي (شاتبوت)
// يتصل بعامل Cloudflare Workers AI؛ وعند تعذره يلجأ لقاعدة أسئلة محلية
// حتمية (صفر هلوسة) تغطي الخدمات الأساسية للمنصة — متعدد اللغات
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { Loader2, Send, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t, useI18n } from "@/lib/i18n";
import { CmdpAssistantIcon } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CHATBOT_ENDPOINT =
  process.env.NEXT_PUBLIC_CHATBOT_URL || "https://cmdp-assistant.tkchouika-cmdp.workers.dev";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "كيف أنشئ حساباً أو أنخرط في تعاونية؟",
  "ما هي صلاحيات كل دور؟",
  "كيف أبحث عن فرص العمل؟",
  "ما هو القانون المنظم للتعاونيات؟",
  "كيف أصوّت في الجمع العام؟",
  "كيف أوصل المنصة بالباك إند المحلي؟",
];

// ─── قاعدة الأسئلة المحلية (بديل حتمي عند غياب العامل) ─────────────────────
const LOCAL_FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["انخرط", "انخراط", "عضو", "عضوية", "أنشئ حساب", "حساب جديد", "تسجيل", "سجل", "compte", "adhésion", "inscri", "account", "join", "member", "iscriz", "adesio", "cuenta", "unirs", "socio"],
    answer:
      "للتسجيل في المنصة ثلاثة مسارات من واجهة «حساب جديد»:\n1. حساب جديد بانتظار مصادقة إدارة المنصة.\n2. الانخراط في تعاونية قائمة: تختارون التعاونية ونوع الطلب (انخراط كعضو بحصص، أو تعاقد/شراكة) — ويصادق على الطلب رئيس التعاونية أو أحد أعضائها المسيّرين.\n3. تسجيل تعاونية جديدة: يقدم الرئيس المقرر الطلب، وتصادق عليه إدارة المنصة ثم يُفعَّل حسابه كرئيس للتعاونية.",
  },
  {
    keywords: ["صلاحيات", "أدوار", "سوبر أدمين", "أدمن", "كوأدمن", "رئيس", "عضو مسير", "متعاقد", "دور", "rôle", "rôles", "permission", "admin", "role", "permess", "ruolo", "rol", "permiso"],
    answer:
      "نظام الأدوار في CMDP متدرج:\n• سوبر أدمين (مالك المنصة): جميع الصلاحيات.\n• أدمن المنصة: المصادقة على تسجيل التعاونيات، وإنشاء/المصادقة على الحسابات وتعيين الكوأدمن (رؤساء وأعضاء مسيرين).\n• كوأدمن (رئيس التعاونية أو عضو مسير): تسيير التعاونية والمصادقة على طلبات الانخراط وإنشاء الحسابات داخل تعاونيته، والرئيس يفوّض المهام للمسيّرين معه.\n• المستخدم العادي: عضو غير مسير (اطلاع ومشاركة وتصويت في الجموع العامة) أو متعاقد (اطلاع على ما هو مصرح به فقط).",
  },
  {
    keywords: ["فرص", "عمل", "وظيفة", "منصب شاغر", "ترشح", "تعاقد", "خدمة", "شغل", "emploi", "opportunité", "poste", "travail", "job", "opportunity", "vacancy", "lavoro", "opportunità", "empleo", "oportunidad", "trabajo"],
    answer:
      "صفحة «فرص العمل والتعاقد» سوق عمومي مفتوح للزوار والمستخدمين: مناصب شاغرة، فرص تعاقد وشراكة، حاجات خدمية، وتداريب — مع بحث وتصفية حسب النوع والقطاع والجهة. الترشح متاح مباشرة بإدخال بيانات التواصل، وتتولى التعاونية دراسة الترشيحات والتواصل مع المقبولين. المسيّرون ينشرون الفرص من تبويب «فرص تعاونيتي».",
  },
  {
    keywords: ["قانون", "112", "112.12", "منظم", "تشريع", "لوائح", "مرسوم", "loi", "juridique", "law", "legal", "regulation", "legge", "giuridic", "regolament", "ley", "legal", "normativ"],
    answer:
      "الإطار القانوني للتعاونيات بالمغرب يقوم أساساً على القانون رقم 112.12 المتعلق بالتعاونيات (2014)، والمرسوم رقم 2.15.617 المتعلق بسجل التعاونيات، وقرار وزارة العدل رقم 1369.16. تضم مكتبة القوانين داخل المنصة هذه النصوص مع نقاطها الأساسية وروابط رسمية. ملاحظة: معلومات المنصة توجيهية عامة ولا تغني عن الاستشارة القانونية المؤهلة.",
  },
  {
    keywords: ["جمع عام", "تصويت", "صوت", "حضور", "جموع", "assemblée", "vote", "voter", "assembly", "vote", "assemblea", "votaz", "asamblea", "votación"],
    answer:
      "العضو غير المسير يمارس حقوقه من «فضائي»: الاطلاع على جدول أعمال الجموع العامة (العادية والاستثنائية)، تأكيد الحضور في الجموع المبرمجة، والتصويت على القرارات (موافقة/معارضة/امتناع) — صوت واحد لكل عضو وفق مبدأ الرقابة الديمقراطية في القانون 112.12.",
  },
  {
    keywords: ["باك إند", "محلي", "sqlite", "اتصال", "إعدادات", "خادم", "server", "api", "backend", "serveur", "paramètres", "settings", "server", "backend", "impostaz", "server", "ajustes"],
    answer:
      "تعمل بيانات التسيير الفعلية عبر باك إند محلي بقاعدة SQLite لدى كل تعاونية. لتوصيل النسخة المنشورة به: شغلوا الخادم محلياً (npm run dev) ثم أدخلوا عنوانه من «الإعدادات ← الاتصال بالباك إند المحلي» مع اختبار الاتصال. دون باك إند تعمل المنصة في وضع عرض تجريبي ببيانات توضيحية.",
  },
  {
    keywords: ["خصوصية", "معطيات", "شروط", "قانونية", "كوكيز", "ملفات تعريف", "privacy", "données", "conditions", "cookies", "privacy", "data", "terms", "privacy", "dati", "termini", "cookie", "privacidad", "datos", "términos"],
    answer:
      "تضم المنصة مركزاً قانونياً كاملاً: الشروط العامة للاستخدام، سياسة الخصوصية وحماية المعطيات (وفق القانون رقم 09.08)، الإشعار القانوني (وفق القانون رقم 53.05)، وسياسة ملفات تعريف الارتباط — تصلون إليها من أسفل الصفحة الرئيسية.",
  },
  {
    keywords: ["دخول", "كلمة المرور", "تجريبي", "demo", "admin", "connexion", "mot de passe", "sign in", "password", "demo", "accesso", "password", "demo", "sesión", "contraseña", "demo"],
    answer:
      "لتجربة المنصة توفَّر حسابات عرض حسب الأدوار (superadmin / admin / president / manager / member / contractor) وكلمة المرور الموحدة cmdp2026. عند تشغيل الباك إند المحلي تصبح هذه الحسابات حقيقية بقاعدة البيانات المحلية.",
  },
];

function localAnswer(question: string): string {
  const q = question.trim();
  for (const faq of LOCAL_FAQ) {
    if (faq.keywords.some((k) => q.includes(k))) return faq.answer;
  }
  return "أستطيع مساعدتكم في: التسجيل والانخراط، الأدوار والصلاحيات، فرص العمل والتعاقد، الجموع العامة والتصويت، القوانين المنظمة للتعاونيات، والتشغيل التقني للمنصة. أعدوا صياغة سؤالكم ضمن هذه المواضيع، أو تواصلوا مع إدارة المنصة للحالات الخاصة.";
}

// ─── تنسيق بسيط: **غامق** + أسطر مرقمة ────────────────────────────────────
function FormattedReply({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} className="text-xs leading-6">
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="font-extrabold text-foreground">
                  {part}
                </strong>
              ) : (
                <React.Fragment key={j}>{part}</React.Fragment>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export function ChatbotWidget({ page }: { page?: string }) {
  const { lang } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [usedFallback, setUsedFallback] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  // رسالة الترحيب بلغة الواجهة
  React.useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: t(
          "مرحباً بكم! أنا **مساعد CMDP** — أرشدكم لاستعمال المنصة وخدماتها: التسجيل والانخراط، الأدوار والصلاحيات، فرص العمل والتعاقد، والقوانين المنظمة للتعاونيات. كيف أساعدكم؟"
        ),
      },
    ]);
  }, [lang]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(CHATBOT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: q }].slice(-10),
          page,
          lang,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as { reply?: string; error?: string };
      const reply = data.reply?.trim();
      if (!reply) throw new Error("empty");
      setUsedFallback(false);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      // البديل المحلي الحتمي — صفر هلوسة
      setUsedFallback(true);
      const answer =
        lang === "ar"
          ? localAnswer(q)
          : LOCAL_FALLBACK_INTRO[lang] ?? localAnswer(q);
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* الزر العائم — جهة النهاية (يسار RTL) بعيداً عن الشريط الجانبي وزر الخروج */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t("إغلاق") : t("فتح المساعد الألي")}
        className={cn(
          "fixed bottom-20 z-40 grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-saffron/40 bg-ink shadow-2xl transition-all hover:scale-105 active:scale-95 lg:bottom-8",
          "end-4"
        )}
      >
        {open ? (
          <X className="size-6 text-cream" />
        ) : (
          <CmdpAssistantIcon className="size-13.5 shadow-2xl" />
        )}
        {!open && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-terra-soft/40" aria-hidden="true" />
        )}
      </button>

      {/* اللوحة */}
      {open && (
        <div
          role="dialog"
          aria-label={t("مساعد CMDP")}
          className="fixed bottom-36 z-40 flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl lg:bottom-24"
          style={{
            insetInlineEnd: "1rem",
            /* وحدات العرض الحية بدل vh/vw المتجمدة في WebView أندرويد */
            height: "min(calc(var(--cmdp-vh, 1vh) * 64), 540px)",
            width: "min(calc(var(--cmdp-vw, 1vw) * 100 - 2rem), 380px)",
          }}
        >
          {/* الترويسة */}
          <div className="relative flex items-center gap-3 bg-ink px-4 py-3">
            <div className="pattern-zellige-cream absolute inset-0 opacity-60" aria-hidden="true" />
            <CmdpAssistantIcon className="relative size-9 shrink-0" />
            <div className="relative min-w-0 flex-1">
              <p className="font-display text-sm font-extrabold text-cream">{t("مساعد CMDP")}</p>
              <p className="flex items-center gap-1 text-[10px] text-cream/70">
                <ShieldCheck className="size-3 text-zellij" />
                {usedFallback ? t("إجابات موثوقة محلية") : t("يرشدكم لخدمات المنصة")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8 text-cream/70 hover:bg-cream/10 hover:text-cream"
              onClick={() => setOpen(false)}
              aria-label={t("إغلاق")}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* الرسائل */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background/60 p-4 scrollbar-thin">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && <CmdpAssistantIcon className="mt-1 size-7 shrink-0" />}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                    m.role === "user"
                      ? "rounded-ee-md bg-terra text-sm font-medium text-ink"
                      : "rounded-es-md border border-border bg-card"
                  )}
                >
                  {m.role === "user" ? <p className="text-xs leading-6">{m.content}</p> : <FormattedReply text={m.content} />}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2">
                <CmdpAssistantIcon className="size-7 shrink-0" />
                <div className="flex items-center gap-1.5 rounded-2xl rounded-es-md border border-border bg-card px-4 py-3">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-terra/60"
                      style={{ animationDelay: `${d * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* أسئلة سريعة */}
          {messages.length <= 2 && !loading && (
            <div className="flex gap-1.5 overflow-x-auto border-t border-border bg-card px-3 py-2 scrollbar-none">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="shrink-0 rounded-full border border-terra/30 bg-terra/5 px-3 py-1.5 text-[10px] font-bold text-terra transition-colors hover:bg-terra/15"
                >
                  {t(q)}
                </button>
              ))}
            </div>
          )}

          {/* الإدخال */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border bg-card p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("اكتبوا سؤالكم هنا...")}
              className="h-10 flex-1 bg-background text-xs"
              aria-label={t("سؤال للمساعد")}
              maxLength={500}
            />
            <Button type="submit" size="icon" className="size-10 shrink-0" disabled={loading || !input.trim()} aria-label={t("إرسال")}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>

          <p className="border-t border-border bg-muted/40 px-3 py-1.5 text-center text-[9px] leading-4 text-muted-foreground">
            {t("معلومات عامة توجيهية وفق القوانين المغربية — ليست استشارة قانونية ملزمة")}
          </p>
        </div>
      )}
    </>
  );
}

// مقدمة البديل المحلي لغير العربية (يوجه المستخدم صوب المواضيع المدعومة)
const LOCAL_FALLBACK_INTRO: Record<string, string> = {
  fr: "Le service en ligne est momentanément indisponible. Je peux vous renseigner sur : l'inscription et l'adhésion, les rôles et permissions, les opportunités d'emploi et de contrat, les assemblées générales et le vote, les lois régissant les coopératives, et le fonctionnement technique de la plateforme. Reformulez votre question dans l'un de ces sujets, ou contactez l'administration de la plateforme.",
  en: "The online service is temporarily unavailable. I can help you with: sign-up and membership, roles and permissions, jobs and contracting, general assemblies and voting, the laws governing cooperatives, and the platform's technical operation. Please rephrase your question within these topics, or contact the platform administration.",
  it: "Il servizio online è temporaneamente non disponibile. Posso aiutarvi con: registrazione e adesione, ruoli e permessi, opportunità di lavoro e contratto, assemblee generali e votazione, le leggi che disciplinano le cooperative e il funzionamento tecnico della piattaforma. Riformulate la domanda entro questi argomenti, o contattate l'amministrazione della piattaforma.",
  es: "El servicio en línea no está disponible temporalmente. Puedo ayudarle con: registro y adhesión, roles y permisos, empleo y contratación, asambleas generales y votación, las leyes que rigen las cooperativas y el funcionamiento técnico de la plataforma. Reformule su pregunta dentro de estos temas, o contacte con la administración de la plataforma.",
};
