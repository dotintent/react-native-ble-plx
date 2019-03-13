@import XCTest;
@import EarlGrey;

@interface SetupTests : XCTestCase
@end

@implementation SetupTests

- (void)testBleManager {
  GREYCondition *waitForStatus = [GREYCondition conditionWithName:@"wait for loading finish" block:^BOOL{
    NSError *error;
        [[EarlGrey selectElementWithMatcher:grey_accessibilityID(@"TestCaseStatus")]
         assertWithMatcher:grey_anyOf(
                                      grey_accessibilityLabel(@"success"),
                                      grey_accessibilityLabel(@"failure"),
                                      nil
                                      ) error:&error];
        return error == nil;
  }];
  
  [waitForStatus waitWithTimeout:60];

  [[EarlGrey selectElementWithMatcher:grey_accessibilityID(@"TestCaseStatus")]
    assertWithMatcher:grey_accessibilityLabel(@"success")];
}

@end
