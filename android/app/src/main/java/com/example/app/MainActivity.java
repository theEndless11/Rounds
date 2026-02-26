package com.rounds.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Install splash screen - it will show the animated music waves
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        
        // Keep splash visible until your app is ready (webview loaded)
        // Set to false to dismiss immediately after animation
        splashScreen.setKeepOnScreenCondition(() -> false);
        
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}