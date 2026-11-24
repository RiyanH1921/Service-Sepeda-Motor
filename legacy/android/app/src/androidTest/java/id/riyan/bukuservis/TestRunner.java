package id.riyan.bukuservis;

import android.os.Bundle;
import android.test.InstrumentationTestRunner;
import junit.framework.TestSuite;

@SuppressWarnings("deprecation")
public final class TestRunner extends InstrumentationTestRunner {
    private boolean deniedScenario;
    @Override public void onCreate(Bundle arguments) {
        Store.databaseName = "instrumentation-main.db";
        deniedScenario=arguments!=null&&arguments.getString("class","").contains("NotificationDeniedTest");
        super.onCreate(arguments);
    }
    @Override public TestSuite getAllTests() {
        TestSuite suite=new TestSuite();
        suite.addTestSuite(NotificationTest.class);
        suite.addTestSuite(StoreTest.class);
        suite.addTestSuite(UiFlowTest.class);
        return suite;
    }
    @Override public void onStart() {
        if(android.os.Build.VERSION.SDK_INT>=33&&!deniedScenario)getUiAutomation().grantRuntimePermission(getTargetContext().getPackageName(),android.Manifest.permission.POST_NOTIFICATIONS);
        super.onStart();
    }
}
