package org.cleanframe.firetv

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.provider.Settings
import android.util.Base64
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class FireBridge(private val context: Context) {

    @JavascriptInterface
    fun launchApp(packageName: String): Boolean {
        return try {
            val pm = context.packageManager
            var launchIntent = pm.getLeanbackLaunchIntentForPackage(packageName)
            if (launchIntent == null) {
                launchIntent = pm.getLaunchIntentForPackage(packageName)
            }
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun getInstalledApps(): String {
        val result = JSONArray()
        try {
            val pm = context.packageManager
            val seen = HashSet<String>()
            val selfPkg = context.packageName

            // 1. Query Leanback launcher apps first
            val leanbackIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER)
            }
            val leanbackList = pm.queryIntentActivities(leanbackIntent, 0)
            for (ri in leanbackList) {
                val pkg = ri.activityInfo.packageName
                if (pkg == selfPkg || seen.contains(pkg)) continue
                seen.add(pkg)

                val label = ri.loadLabel(pm).toString()
                val iconBase64 = drawableToBase64(ri.loadIcon(pm))

                val appObj = JSONObject().apply {
                    put("packageName", pkg)
                    put("name", label)
                    put("icon", iconBase64)
                }
                result.put(appObj)
            }

            // 2. Query standard launcher apps as secondary (if not already found)
            val standardIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val standardList = pm.queryIntentActivities(standardIntent, 0)
            for (ri in standardList) {
                val pkg = ri.activityInfo.packageName
                if (pkg == selfPkg || seen.contains(pkg)) continue
                seen.add(pkg)

                val label = ri.loadLabel(pm).toString()
                val iconBase64 = drawableToBase64(ri.loadIcon(pm))

                val appObj = JSONObject().apply {
                    put("packageName", pkg)
                    put("name", label)
                    put("icon", iconBase64)
                }
                result.put(appObj)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result.toString()
    }

    @JavascriptInterface
    fun openSettings(): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun openScreensaver(): Boolean {
        return try {
            // Attempt Fire TV Ambient Mode first, fallback to standard screensaver/dock
            val ambientIntent = Intent("com.amazon.device.ambientmode.ACTION_START_AMBIENT_MODE").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (context.packageManager.resolveActivity(ambientIntent, 0) != null) {
                context.startActivity(ambientIntent)
                true
            } else {
                val dreamIntent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_DESK_DOCK)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(dreamIntent)
                true
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @JavascriptInterface
    fun openNativeHome(): Boolean {
        return try {
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(homeIntent)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun drawableToBase64(drawable: Drawable?): String {
        if (drawable == null) return ""
        return try {
            val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
                drawable.bitmap
            } else {
                val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth.coerceAtMost(128) else 96
                val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight.coerceAtMost(128) else 96
                val b = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(b)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                b
            }
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, stream)
            val byteArray = stream.toByteArray()
            "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            ""
        }
    }
}
