# قواعد ProGuard — CMDP
-keep class ma.cmdp.platform.** { *; }
-keepattributes SourceFile,LineNumberTable
# WebView
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public void *(android.webkit.WebView, java.lang.String);
}
-dontwarn android.webkit.**
