// ═══════════════════════════════════════════════════════════════════════════
// CMDP — النشاط الرئيسي: عرض ويب ملء الشاشة 100% بوضع الانغماس
//
// المتطلبات المحققة:
// • ملء الشاشة بالكامل مع إخفاء شريطي النظام العلوي والسفلي
// • يظهران مؤقتاً بالسحب للأعلى/الأسفل (BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)
// • انسجام مع الهواتف واللوحيات (WebView يتبع حجم الشاشة والاتجاه)
// • رفع الملفات (نماذج التسجيل والمستندات) وتنزيلها
// • زر الرجوع يتنقل داخل الويب، وروابط الخارج تفتح بالمتصفح
// ═══════════════════════════════════════════════════════════════════════════

package ma.cmdp.platform

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    companion object {
        const val PLATFORM_URL = "https://cmdp.pages.dev"
        private val INTERNAL_HOSTS = setOf("cmdp.pages.dev")
    }

    private lateinit var swipe: SwipeRefreshLayout
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

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
            setOnRefreshListener { webView.reload() }
        }
        webView = WebView(this).apply {
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
        }
        swipe.addView(webView)
        setContentView(FrameLayout(this).apply { addView(swipe) })

        setupWebView()
        setupBackNavigation()

        // استئناف الحالة أو فتح المنصة
        val deepLink = intent?.dataString
        val restored = savedInstanceState?.getBoolean("restored", false) == true
        if (restored) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(deepLink ?: PLATFORM_URL)
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

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
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

            override fun onPageFinished(view: WebView, url: String) {
                swipe.isRefreshing = false
                CookieManager.getInstance().flush()
            }

            @Deprecated("Deprecated in Java")
            override fun onReceivedError(view: WebView, errorCode: Int, description: String?, failingUrl: String) {
                if (failingUrl == view.url && !isOnline()) {
                    view.loadUrl("file:///android_asset/offline.html")
                }
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
