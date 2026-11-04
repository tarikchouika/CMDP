// ═══════════════════════════════════════════════════════════════════════════
// CMDP — ودجت المساعد الألي (شاتبوت)
// يتصل بعامل Cloudflare Workers AI؛ وعند تعذره يلجأ لقاعدة أسئلة محلية
// حتمية (صفر هلوسة) تغطي الخدمات الأساسية للمنصة
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { Bot, Loader2, MessageCircle, Send, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CmdpMark } from "@/components/patterns";
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
    keywords: ["انخرط", "انخراط", "عضو", "عضوية", "أنشئ حساب", "حساب جديد", "تسجيل", "سجل"],
    answer:
      "للتسجيل في المنصة ثلاثة مسارات من واجهة «حساب جديد»:\n1. حساب جديد بانتظار مصادقة إدارة المنصة.\n2. الانخراط في تعاونية قائمة: تختارون التعاونية ونوع الطلب (انخراط كعضو بحصص، أو تعاقد/شراكة) — ويصادق على الطلب رئيس التعاونية أو أحد أعضائها المسيّرين.\n3. تسجيل تعاونية جديدة: يقدم الرئيس المقرر الطلب، وتصادق عليه إدارة المنصة ثم يُفعَّل حسابه كرئيس للتعاونية.",
  },
  {
    keywords: ["صلاحيات", "أدوار", "سوبر أدمين", "أدمن", "كوأدمن", "رئيس", "عضو مسير", "متعاقد", "دور"],
    answer:
      "نظام الأدوار في CMDP متدرج:\n• سوبر أدمين (مالك المنصة): جميع الصلاحيات.\n• أدمن المنصة: المصادقة على تسجيل التعاونيات، وإنشاء/المصادقة على الحسابات وتعيين الكوأدمن (رؤساء وأعضاء مسيرين).\n• كوأدمن (رئيس التعاونية أو عضو مسير): تسيير التعاونية والمصادقة على طلبات الانخراط وإنشاء الحسابات داخل تعاونيته، والرئيس يفوّض المهام للمسيّرين معه.\n• المستخدم العادي: عضو غير مسير (اطلاع ومشاركة وتصويت في الجموع العامة) أو متعاقد (اطلاع على ما هو مصرح به فقط).",
  },
  {
    keywords: ["فرص", "عمل", "وظيفة", "منصب شاغر", "ترشح", "تعاقد", "خدمة", "شغل"],
    answer:
      "صفحة «فرص العمل والتعاقد» سوق عمومي مفتوح للزوار والمستخدمين: مناصب شاغرة، فرص تعاقد وشراكة، حاجات خدمية، وتداريب — مع بحث وتصفية حسب النوع والقطاع والجهة. الترشح متاح مباشرة بإدخال بيانات التواصل، وتتولى التعاونية دراسة الترشيحات والتواصل مع المقبولين. المسيّرون ينشرون الفرص من تبويب «فرص تعاونيتي».",
  },
  {
    keywords: ["قانون", "112", "112.12", "منظم", "تشريع", "لوائح", "مرسوم"],
    answer:
      "الإطار القانوني للتعاونيات بالمغرب يقوم أساساً على القانون رقم 112.12 المتعلق بالتعاونيات (2014)، والمرسوم رقم 2.15.617 المتعلق بسجل التعاونيات، وقرار وزارة العدل رقم 1369.16. تضم مكتبة القوانين داخل المنصة هذه النصوص مع نقاطها الأساسية وروابط رسمية. ملاحظة: معلومات المنصة توجيهية عامة ولا تغني عن الاستشارة القانونية المؤهلة.",
  },
  {
    keywords: ["جمع عام", "تصويت", "صوت", "حضور", "جموع"],
    answer:
      "العضو غير المسير يمارس حقوقه من «فضائي»: الاطلاع على جدول أعمال الجموع العامة (العادية والاستثنائية)، تأكيد الحضور في الجموع المبرمجة، والتصويت على القرارات (موافقة/معارضة/امتناع) — صوت واحد لكل عضو وفق مبدأ الرقابة الديمقراطية في القانون 112.12.",
  },
  {
    keywords: ["باك إند", "محلي", "sqlite", "اتصال", "إعدادات", "خادم", "server", "api"],
    answer:
      "تعمل بيانات التسيير الفعلية عبر باك إند محلي بقاعدة SQLite لدى كل تعاونية. لتوصيل النسخة المنشورة به: شغلوا الخادم محلياً (npm run dev) ثم أدخلوا عنوانه من «الإعدادات ← الاتصال بالباك إند المحلي» مع اختبار الاتصال. دون باك إند تعمل المنصة في وضع عرض تجريبي ببيانات توضيحية.",
  },
  {
    keywords: ["خصوصية", "معطيات", "شروط", "قانونية", "كوكيز", "ملفات تعريف"],
    answer:
      "تضم المنصة مركزاً قانونياً كاملاً: الشروط العامة للاستخدام، سياسة الخصوصية وحماية المعطيات (وفق القانون رقم 09.08)، الإشعار القانوني (وفق القانون رقم 53.05)، وسياسة ملفات تعريف الارتباط — تصلون إليها من أسفل الصفحة الرئيسية.",
  },
  {
    keywords: ["دخول", "كلمة المرور", "تجريبي", "demo", "admin"],
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
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "assistant",
      content:
        "مرحباً بكم! أنا **مساعد CMDP** — أرشدكم لاستعمال المنصة وخدماتها: التسجيل والانخراط، الأدوار والصلاحيات، فرص العمل والتعاقد، والقوانين المنظمة للتعاونيات. كيف أساعدكم؟",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [usedFallback, setUsedFallback] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

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
      setMessages((m) => [...m, { role: "assistant", content: localAnswer(q) }]);
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
        aria-label={open ? "إغلاق المساعد" : "فتح المساعد الألي"}
        className={cn(
          "fixed bottom-20 z-50 grid size-14 place-items-center rounded-full border border-saffron/30 bg-gradient-to-b from-terra to-terra-soft text-ink shadow-2xl transition-all hover:scale-105 active:scale-95 lg:bottom-8",
          "end-4"
        )}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-terra-soft/40" aria-hidden="true" />
        )}
      </button>

      {/* اللوحة */}
      {open && (
        <div
          role="dialog"
          aria-label="مساعد CMDP"
          className="fixed bottom-36 z-50 flex h-[min(64vh,540px)] w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl lg:bottom-24"
          style={{ insetInlineEnd: "1rem" }}
        >
          {/* الترويسة */}
          <div className="relative flex items-center gap-3 bg-ink px-4 py-3">
            <div className="pattern-zellige-cream absolute inset-0 opacity-60" aria-hidden="true" />
            <CmdpMark className="relative size-9 text-terra-soft" />
            <div className="relative min-w-0 flex-1">
              <p className="font-display text-sm font-extrabold text-cream">مساعد CMDP</p>
              <p className="flex items-center gap-1 text-[10px] text-cream/70">
                <ShieldCheck className="size-3 text-zellij" />
                {usedFallback ? "إجابات موثوقة محلية" : "يرشدكم لخدمات المنصة"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8 text-cream/70 hover:bg-cream/10 hover:text-cream"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* الرسائل */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background/60 p-4 scrollbar-thin">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-terra/15 text-terra">
                    <Bot className="size-4" />
                  </span>
                )}
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
                <span className="grid size-7 place-items-center rounded-full bg-terra/15 text-terra">
                  <Bot className="size-4" />
                </span>
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
                  {q}
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
              placeholder="اكتبوا سؤالكم هنا..."
              className="h-10 flex-1 bg-background text-xs"
              aria-label="سؤال للمساعد"
              maxLength={500}
            />
            <Button type="submit" size="icon" className="size-10 shrink-0" disabled={loading || !input.trim()} aria-label="إرسال">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>

          <p className="border-t border-border bg-muted/40 px-3 py-1.5 text-center text-[9px] leading-4 text-muted-foreground">
            معلومات عامة توجيهية وفق القوانين المغربية — ليست استشارة قانونية ملزمة
          </p>
        </div>
      )}
    </>
  );
}
