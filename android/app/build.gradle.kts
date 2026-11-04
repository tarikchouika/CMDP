// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة التطبيق
// التوقيع بشهادة ملكية رقمية لمدة 30 سنة: CN=TARIK CHOUIKA (حتى 2056)
// الإصدار يُمرَّر من سير العمل: -PversionCode= -PversionName=
// ═══════════════════════════════════════════════════════════════════════════

import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// ─── إعدادات التوقيع (keystore ملتزم بالمستودع + تجاوز اختياري بأسرار GH) ───
val keystoreProperties = Properties().apply {
    val f = rootProject.file("cmdp-release.keystore.properties")
    if (f.exists()) load(FileInputStream(f))
}

android {
    namespace = "ma.cmdp.platform"
    compileSdk = 35

    defaultConfig {
        applicationId = "ma.cmdp.platform"
        minSdk = 24          // أندرويد 7.0+ (تغطية تفوق 99% من الأجهزة)
        targetSdk = 35
        versionCode = (project.findProperty("versionCode") as String?)?.toInt() ?: 1
        versionName = (project.findProperty("versionName") as String?) ?: "1.0.0"
        resourceConfigurations += listOf("ar", "fr", "en", "it", "es")

        // دعم كامل للهواتف واللوحيات بمختلف أحجام الشاشات ونسب العرض
        vectorDrawables { useSupportLibrary = true }
    }

    signingConfigs {
        create("release") {
            // من أسرار GitHub Actions إن وُجدت، وإلا فالملف الملتزم
            storeFile = file(System.getenv("CMDP_STORE_FILE") ?: "cmdp-release.keystore")
            storePassword = System.getenv("CMDP_STORE_PASSWORD") ?: keystoreProperties.getProperty("storePassword", "CMDP2030-Cmdp!")
            keyAlias = System.getenv("CMDP_KEY_ALIAS") ?: keystoreProperties.getProperty("keyAlias", "cmdp-platform")
            keyPassword = System.getenv("CMDP_KEY_PASSWORD") ?: keystoreProperties.getProperty("keyPassword", "CMDP2030-Cmdp!")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}
