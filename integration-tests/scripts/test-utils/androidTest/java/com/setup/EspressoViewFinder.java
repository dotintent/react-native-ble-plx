package com.setup;

import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;

import org.hamcrest.Description;
import org.hamcrest.Matcher;
import org.hamcrest.TypeSafeMatcher;

import java.util.concurrent.TimeoutException;

import androidx.test.espresso.PerformException;
import androidx.test.espresso.UiController;
import androidx.test.espresso.ViewAction;
import androidx.test.espresso.ViewInteraction;
import androidx.test.espresso.matcher.ViewMatchers;
import androidx.test.espresso.util.HumanReadables;
import androidx.test.espresso.util.TreeIterables;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.matcher.ViewMatchers.isRoot;
import static androidx.test.espresso.matcher.ViewMatchers.withEffectiveVisibility;

public class EspressoViewFinder {
    private static long CHECK_INTERVAL = 50L;
    private static long TIMEOUT_MS = 10 * 1000L;


    static ViewInteraction waitForDisplayed(Matcher<View> viewMatcher) {

        return onView(isRoot()).perform(createWaitForDisplayedViewAction(viewMatcher, TIMEOUT_MS));
    }

    private static ViewAction createWaitForDisplayedViewAction(final Matcher<View> viewMatcher,
                                                               final Long timeOut) {
        return new ViewAction() {
            @Override
            public Matcher<View> getConstraints() {
                return isRoot();
            }

            @Override
            public String getDescription() {
                return "waitForDisplayed on viewMatcher <$viewMatcher> without timeOut $timeOut ms.";
            }

            @Override
            public void perform(UiController uiController, View view) {
                uiController.loopMainThreadUntilIdle();

                boolean found = waitForView(uiController, view);

                if (!found) {
                    throw createPerformException(view);
                }
            }

            private boolean waitForView(UiController uiController, View view) {

                long timeOutTimeStamp = System.currentTimeMillis() + timeOut;
                do {
                    // find view with required matcher:
                    for (View child : TreeIterables.breadthFirstViewTraversal(view)) {
                        if (viewMatcher.matches(child) && isDisplayed(child)) {
                            return true;
                        }
                    }
                    uiController.loopMainThreadForAtLeast(CHECK_INTERVAL);
                } while (System.currentTimeMillis() < timeOutTimeStamp);

                return false;
            }

            private PerformException createPerformException(View view) {
                return new PerformException.Builder()
                        .withActionDescription(this.getDescription())
                        .withViewDescription(HumanReadables.describe(view))
                        .withCause(new TimeoutException())
                        .build();
            }
        };
    }


    private static boolean isDisplayed(View view) {
        return view.getGlobalVisibleRect(new Rect()) &&
                withEffectiveVisibility(ViewMatchers.Visibility.VISIBLE).matches(view);
    }

    /**
     * Finds a matcher's view's child at the given index.
     */
    Matcher<View> childAtIndex(final Matcher<View> parentMatcher, final int childPosition) {
        return new TypeSafeMatcher<View>() {
            @Override
            protected boolean matchesSafely(View view) {
                if (view.getParent() instanceof ViewGroup) {
                    return parentMatcher.matches(view.getParent());
                }

                ViewGroup group = (ViewGroup) view.getParent();
                return parentMatcher.matches(view.getParent()) && group.getChildAt(childPosition) == view;
            }

            @Override
            public void describeTo(Description description) {
                description.appendText("childAtIndex $childPosition of type $parentMatcher");
            }
        };
    }

}
