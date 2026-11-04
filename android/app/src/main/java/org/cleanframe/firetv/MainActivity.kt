package org.cleanframe.firetv

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on for TV display
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Hide system bars and enable immersive mode
        hideSystemUI()

        webView = WebView(this).apply {
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            isFocusable = true
            isFocusableInTouchMode = true

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                loadsImagesAutomatically = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                textZoom = 100
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
            }

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        android.util.Log.d("CleanFrameJS", "${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}")
                    }
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    view?.requestFocus()
                    triggerResize()
                }
            }

            addJavascriptInterface(FireBridge(this@MainActivity), "FireBridge")
        }

        setContentView(webView)

        // Load the CleanFrame web application bundled from app/
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun triggerResize() {
        webView.evaluateJavascript(
            "(function() { if (typeof window.dispatchEvent === 'function') { window.dispatchEvent(new Event('resize')); } })();",
            null
        )
    }

    override fun onResume() {
        super.onResume()
        hideSystemUI()
        webView.requestFocus()
        triggerResize()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
            triggerResize()
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // Forward BACK key to WebView as Escape keydown/keyup so CleanFrame's internal panel navigation handles it
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
            val type = if (event.action == KeyEvent.ACTION_DOWN) "keydown" else "keyup"
            webView.evaluateJavascript(
                """
                (function() {
                    var ev = new KeyboardEvent('$type', {
                        key: 'Escape',
                        code: 'Escape',
                        keyCode: 27,
                        which: 27,
                        bubbles: true,
                        cancelable: true
                    });
                    document.dispatchEvent(ev);
                })();
                """.trimIndent(),
                null
            )
            return true
        }

        // Handle D-pad Center key as Enter
        if (event.keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {
            val type = if (event.action == KeyEvent.ACTION_DOWN) "keydown" else "keyup"
            webView.evaluateJavascript(
                """
                (function() {
                    var ev = new KeyboardEvent('$type', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    document.dispatchEvent(ev);
                })();
                """.trimIndent(),
                null
            )
            return true
        }

        return super.dispatchKeyEvent(event)
    }

    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }
}
