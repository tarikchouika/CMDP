// ═══════════════════════════════════════════════════════════════════════════
// CMDP — النشاط الرئيسي: عرض ويب ملء الشاشة 100% بوضع الانغماس
//
// المتطلبات المحققة:
// • ملء الشاشة بالكامل مع إخفاء شريطي النظام العلوي والسفلي
// • يظهران مؤقتاً بالسحب للأعلى/الأسفل (BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)
// • انسجام مع الهواتف واللوحيات (WebView يتبع حجم الشاشة والاتجاه)
// • رفع الملفات (نماذج التسجيل والمستندات) وتنزيلها
// • زر الرجوع يتنقل داخل الويب، وروابط الخارج تفتح بالمتصفح
//
// حصانة الشاشة البيضاء (الإصدار 1.3.2):
// • فشل تحميل الإطار الرئيسي (DNS/شبكة/خادم) → صفحة عدم الاتصال بالهوية دائماً
//   — سابقاً كان الشرط isOnline() يفوّت أعطال DNS والشهادات واعتراض مزود الخدمة
// • أخطاء HTTP (5xx/404) للإطار الرئيسي → نفس الصفحة بسلام
// • انهيار عارض WebView (onRenderProcessGone) → إعادة بناء النشاط بدل تجمد أبيض
// • عودة الاتصال بعد انقطاع → تحميل تلقائي للمنصة (NetworkCallback)
// • دعم حوارات JS (alert/confirm/prompt) — كانت صامتة بلا تنفيذ في WebView
//
// جذر الشاشة البيضاء (الإصدار 1.3.3 — الإصلاح الجذري):
// • حُذف setInitialScale(1) — كان يُظهر المنصة كلها كشريط مصغّر (~%1 مقياساً)
//   والباقي فراغ؛ عاد الزوج القياسي useWideViewPort + loadWithOverviewMode
//   (إعداد v1.2.0 الذي كان يعمل) مع بقاء مستمع إينتس لوحة المفاتيح.
// ═══════════════════════════════════════════════════════════════════════════

package ma.cmdp.platform

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    companion object {
        const val PLATFORM_URL = "https://cmdp.pages.dev"
        const val OFFLINE_URL = "file:///android_asset/offline.html"
        private val INTERNAL_HOSTS = setOf("cmdp.pages.dev")
    }

    private lateinit var swipe: SwipeRefreshLayout
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // ── حالة فشل الصفحة: لتحميل المنصة تلقائياً فور عودة الاتصال ─────────────
    @Volatile private var pageFailed = false

    /** مراقب عودة الاتصال: يعيد فتح المنصة إن كانت صفحة عدم الاتصال معروضة */
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            runOnUiThread {
                if (pageFailed && webView.url?.startsWith("file:") == true) {
                    pageFailed = false
                    loadPlatform()
                }
            }
        }
    }
    private var callbackRegistered = false

    // منتقي الملفات لرفع الوثائق والصور من نماذج المنصة
    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris = if (result.resultCode == RESULT_OK) {
                (result.data?.let { data ->
                    if (data.clipData != null) {
                        (0 until data.clipData!!.itemCount).map { data.clipData!!.getItemAt(it).uri }
                    } else listOfNotNull(data.data)
                }) ?: emptyList()
            } else emptyList()
            filePathCallback?.onReceiveValue(uris.toTypedArray())
            filePathCallback = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ─── ملء الشاشة 100%: الرسم خلف أشرطة النظام + إخفاؤها ───
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        applyImmersiveMode()

        // ─── الهيكل: سحب للتحديث يلفّ عرض الويب ───
        swipe = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(Color.parseColor("#d9a03f"), Color.parseColor("#9c4526"))
            setOnRefreshListener { loadPlatform() }
            // خلفية داكنة مطابقة للويب — تظهر عند تقليص المساحة بلوحة المفاتيح
            setBackgroundColor(Color.parseColor("#1a0e08"))
        }
        webView = WebView(this).apply {
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            // لا تستدعِ setInitialScale إطلاقاً: معاملها نسبة مئوية (1 = ‏%1!) —
            // أي قيمة صريحة تُلغي حساب الكثافة فتُعرض الصفحة ببكسلات فيزيائية
            // (تخطيط 1080px بدل 412px) ويتقلص كل المحتوى إلى شريط مصغّر أعلى
            // الشاشة والباقي فراغ — هذا هو جذر «الشاشة البيضاء». الافتراضي (0)
            // يحترم وسم meta viewport مع مقياس الكثافة الصحيح كما في كروم.
        }
        swipe.addView(webView)
        setContentView(FrameLayout(this).apply { addView(swipe) })

        // ─── لوحة المفاتيح: تقليص مساحة الويب فوقها ───
        // الوضع الغامر (decorFitsSystemWindows=false) يمنع التصغير الآلي على API 30+،
        // لذا نطبّق إينتس لوحة المفاتيح يدوياً — دون المساس بإخفاء شريطي النظام.
        ViewCompat.setOnApplyWindowInsetsListener(swipe) { v, insets ->
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(0, 0, 0, ime.bottom)
            WindowInsetsCompat.CONSUMED
        }

        setupWebView()
        setupBackNavigation()

        // استئناف الحالة أو فتح المنصة
        val deepLink = intent?.dataString
        val restored = savedInstanceState?.getBoolean("restored", false) == true
        if (restored) {
            webView.restoreState(savedInstanceState)
        } else {
            loadPlatform(deepLink)
        }
    }

    /** فتح المنصة (أو رابط عمق داخلي) مع تصفير حالة الفشل */
    private fun loadPlatform(url: String? = null) {
        pageFailed = false
        webView.loadUrl(url ?: PLATFORM_URL)
    }

    /** عرض صفحة عدم الاتصال بالهوية — بلا تكرار تحميلها إن كانت معروضة */
    private fun showOfflinePage() {
        pageFailed = true
        swipe.isRefreshing = false
        if (webView.url?.startsWith("file:") != true) {
            webView.loadUrl(OFFLINE_URL)
        }
    }

    /** وضع الانغماس اللزج: الشريطان مخفيان ويظهران بالسحب ثم يختفيان تلقائياً */
    private fun applyImmersiveMode() {
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) applyImmersiveMode()
    }

    // ─── مراقبة الشبكة: تسجيل عند الظهور وإلغاء عند الاختفاء (دورة حياة نظيفة) ───
    override fun onStart() {
        super.onStart()
        if (!callbackRegistered) {
            try {
                val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                cm.registerNetworkCallback(
                    android.net.NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build(),
                    networkCallback
                )
                callbackRegistered = true
            } catch (_: Exception) {
                // بعض الأجهزة القديمة: نتجاهل بهدوء — زر إعادة المحاولة يبقى متاحاً
            }
        }
    }

    override fun onStop() {
        if (callbackRegistered) {
            try {
                val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                cm.unregisterNetworkCallback(networkCallback)
            } catch (_: Exception) { }
            callbackRegistered = false
        }
        super.onStop()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            // الزوج القياسي للصفحات المتجاوبة الحاملة لوسم meta viewport صحيح
            // (width=device-width): useWideViewPort يفعّل احترام وسم العرض
            // وloadWithOverviewMode يضبط العرض الأولي على ملاءمة عرض المحتوى —
            // النتيجة مطابقة تماماً لسلوك كروم: 412px منطقية على شاشة 1080px
            // ووحدات vh/vw محسوبة سليمة (التصحيح الحقيقي لخلل النوافذ كان
            // مستمع إينتس لوحة المفاتيح أعلاه لا تثبيت المقياس).
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = false
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = true
            allowFileAccess = true
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString CMDP-Android/${BuildConfig.VERSION_NAME}"
            textZoom = 100
        }
        webView.setBackgroundColor(Color.parseColor("#1a0e08"))

        // ملفات تعريف الارتباط + الاستمرار
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                return if (uri.scheme == "http" || uri.scheme == "https") {
                    if (uri.host in INTERNAL_HOSTS) false else {
                        openExternally(uri); true
                    }
                } else {
                    try { openExternally(uri) } catch (_: ActivityNotFoundException) { }
                    true
                }
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                // صفحة جديدة تبدأ بحالة نظيفة — الفشل يعلن عن نفسه في معاودات الخطأ
                if (url.startsWith("http")) pageFailed = false
            }

            override fun onPageFinished(view: WebView, url: String) {
                swipe.isRefreshing = false
                CookieManager.getInstance().flush()
            }

            // ── فشل تحميل الإطار الرئيسي (النسخة الحديثة API 23+) ─────────────
            // أي عطل في الصفحة ذاتها (DNS، انقطاع، شهادة، اعتراض مزود الخدمة…)
            // يعرض صفحة عدم الاتصال دائماً — بلا الاعتماد الحصري على isOnline()
            // الذي كان يفوّت أعطال الشبكة القائمة-المعطلة (خلل الشاشة البيضاء).
            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) showOfflinePage()
                // أخطاء الموارد الفرعية (صور/خطوط) لا تُسقط الصفحة
            }

            /** النسخة القديمة (أندرويد 6 فما دون) — نفس منطق الإطار الرئيسي */
            @Deprecated("Deprecated in Java")
            override fun onReceivedError(view: WebView, errorCode: Int, description: String?, failingUrl: String) {
                if (failingUrl == view.url) showOfflinePage()
            }

            /** أخطاء HTTP للإطار الرئيسي (5xx/404 من الاستضافة) — بلا شاشة بيضاء */
            override fun onReceivedHttpError(
                view: WebView,
                request: WebResourceRequest,
                errorResponse: WebResourceResponse
            ) {
                if (request.isForMainFrame) showOfflinePage()
            }

            /** انهيار عارض WebView: إعادة بناء النشاط بدل تجمّد شاشة فارغة */
            override fun onRenderProcessGone(view: WebView, detail: android.webkit.RenderProcessGoneDetail): Boolean {
                // نغلق العارض المتعطل بأمان ونعيد بناء الواجهة من الصفر
                try {
                    webView.destroy()
                } catch (_: Exception) { }
                recreate()
                return true // عالجنا الحدث — لا نسخة نظام قديمة تظهر للمستخدم
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // رفع الملفات: صور الهوية، الوثائق القانونية، الفواتير...
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                val intent = params.createIntent().apply {
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: ActivityNotFoundException) {
                    filePathCallback = null
                    false
                }
            }

            // ── حوارات JS: كانت صامتة بلا هذه المعالجات في WebView ──────────────
            override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }

            override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
                    .setNegativeButton(android.R.string.cancel) { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }

            override fun onJsPrompt(
                view: WebView,
                url: String,
                message: String,
                defaultValue: String,
                result: JsPromptResult
            ): Boolean {
                val input = EditText(this@MainActivity).apply {
                    hint = defaultValue
                    setText(defaultValue)
                }
                AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm(input.text.toString()) }
                    .setNegativeButton(android.R.string.cancel) { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }
        }

        // تنزيل الملفات (تقارير، وثائق) عبر مدير التنزيل
        webView.setDownloadListener(DownloadListener { url, _, contentDisposition, mimeType, _ ->
            try {
                val name = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType)
                val req = DownloadManager.Request(Uri.parse(url)).apply {
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
                    setMimeType(mimeType)
                }
                (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
                Toast.makeText(this@MainActivity, getString(R.string.downloading), Toast.LENGTH_SHORT).show()
            } catch (_: Exception) {
                openExternally(Uri.parse(url))
            }
        })
    }

    /** زر الرجوع: تنقل داخل الويب ثم خروج بتأكيد */
    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    // صفحة عدم الاتصال: الرجوع يحاول فتح المنصة مباشرة
                    webView.url?.startsWith("file:") == true -> loadPlatform()
                    webView.canGoBack() -> webView.goBack()
                    else -> confirmExit()
                }
            }
        })
    }

    private fun confirmExit() {
        AlertDialog.Builder(this)
            .setTitle(R.string.app_name)
            .setMessage(R.string.confirm_exit)
            .setPositiveButton(R.string.exit) { _, _ -> finish() }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun openExternally(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.no_app, Toast.LENGTH_SHORT).show()
        }
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    // ─── حفظ/استئناف حالة العرض عند التدوير (الهواتف واللوحيات) ───
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
        outState.putBoolean("restored", true)
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        applyImmersiveMode()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
