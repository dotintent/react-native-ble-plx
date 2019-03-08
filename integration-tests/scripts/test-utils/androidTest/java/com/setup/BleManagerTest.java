package com.setup;

import org.hamcrest.core.StringStartsWith;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import androidx.test.rule.ActivityTestRule;
import androidx.test.runner.AndroidJUnit4;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.assertion.ViewAssertions.selectedDescendantsMatch;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withContentDescription;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static com.setup.EspressoViewFinder.waitForDisplayed;
import static org.hamcrest.Matchers.anyOf;


@RunWith(AndroidJUnit4.class)
public class BleManagerTest {
    @Rule
    public ActivityTestRule<MainActivity> mActivityRule
            = new ActivityTestRule<>(MainActivity.class);

    @Test
    public void verifyTestSuite() {
        waitForDisplayed(withContentDescription("TestSuite")).check(matches(isDisplayed()));
        waitForDisplayed(anyOf(withText("failure"), withText("success")))
                .check(matches(isDisplayed()));

        onView(withContentDescription(new StringStartsWith("TestCase-")))
                .check(selectedDescendantsMatch(
                        withContentDescription("TestCaseStatus"),
                        withText("success")));

    }
}
