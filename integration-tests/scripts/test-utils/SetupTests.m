@import XCTest;
@import EarlGrey;

@interface SetupTests : XCTestCase
@end

@implementation SetupTests

- (void)verifyTestSuite {
  [[EarlGrey selectElementWithMatcher:grey_accessibilityID(@"TestCaseStatus")]
    assertWithMatcher:grey_accessibilityLabel(@"success")];
}

@end