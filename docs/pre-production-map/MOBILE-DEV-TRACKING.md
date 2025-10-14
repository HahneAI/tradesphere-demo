# Mobile Development Tracking

**Purpose**: Track mobile-specific implementation details and native app migration requirements
**Owner**: mobile-developer agent
**Status**: Active tracking for PWA ’ Native App conversion
**Last Updated**: 2025-10-14

---

## Current State: Progressive Web App (PWA)

### Deployment Status
- **Platform**: Web browsers (desktop + mobile)
- **Primary Targets**: iOS Safari 15+, Chrome Mobile 100+
- **Framework**: React 18 + TypeScript + Vite
- **Responsive**: 320px (iPhone SE) to 1920px (desktop)
- **PWA Features**: Service workers, offline mode, install prompts

### Mobile Browser Support Matrix

| Feature | iOS Safari | Chrome Android | Status |
|---------|-----------|----------------|--------|
| Touch targets (44x44px) |  Compliant |  Compliant | LIVE |
| Haptic feedback |  Vibration API |  Vibration API | LIVE |
| Pull-to-refresh |  CSS overscroll |  CSS overscroll | LIVE |
| Swipe gestures |  Touch events |  Touch events | LIVE |
| Responsive design |  320px-428px |  320px-428px | LIVE |
| Service workers |  Supported |  Supported | PLANNED |
| Offline mode | ø Not implemented | ø Not implemented | PLANNED |

---

## Future State: Native Mobile Apps

### Target Platforms
1. **iOS App Store**
   - Technology: Swift/SwiftUI or React Native
   - Min iOS Version: 15.0
   - Target Devices: iPhone, iPad

2. **Google Play Store**
   - Technology: Kotlin or React Native
   - Min Android Version: API 28 (Android 9)
   - Target Devices: Phones, tablets

### Migration Strategy
- **Recommended Path**: React Native (code reuse from PWA)
- **Alternative Path**: Native (Swift + Kotlin for performance)
- **Timeline**: Post-launch (after Phase 7 completion)

---

## Phase 3H: Customer Management Mobile Tracking

### Overview
Phase 3H implements comprehensive UI/UX enhancements with accessibility improvements, mobile optimizations, and visual polish for the Customer Management System.

**Components Affected**:
1. CustomersTab (main customer list)
2. CustomerDetailModal (customer profile view)
3. CustomerCreateWizard (new customer creation)
4. CustomerSyncPanel (data sync operations)

**Key Improvements**:
- WCAG 2.1 AA accessibility compliance
- Mobile-first responsive design
- Pull-to-refresh pattern
- Swipe gestures
- Bottom sheet modals
- Enhanced empty states
- Toast notifications

---

## Phase 3H-1: Accessibility Patterns

### ARIA Live Regions

**Current PWA Implementation**:
```typescript
// File: src/components/CustomersTab.enhanced.tsx:719-725
<div
  id="search-results-count"
  className="sr-only"
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {searchQuery && `Found ${searchResultCount} customers`}
</div>
```

**Native App Migration**:

**iOS (Swift/SwiftUI)**:
```swift
// Use UIAccessibility.post for screen reader announcements
UIAccessibility.post(
  notification: .announcement,
  argument: "Found \(searchResultCount) customers"
)
```

**Android (Kotlin)**:
```kotlin
// Use announceForAccessibility for TalkBack
searchResultsView.announceForAccessibility(
  "Found $searchResultCount customers"
)
```

**React Native**:
```typescript
// Use AccessibilityInfo API
import { AccessibilityInfo } from 'react-native';

AccessibilityInfo.announceForAccessibility(
  `Found ${searchResultCount} customers`
);
```

**Migration Risk**: =á MEDIUM
**Reason**: Requires platform-specific accessibility API calls
**Effort**: 2-3 hours to implement cross-platform abstraction

---

### Focus Management & Keyboard Navigation

**Current PWA Implementation**:
```typescript
// File: src/components/CustomersTab.enhanced.tsx:195-225
useEffect(() => {
  if (!isOpen || !modalRef.current) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }

    if (e.key === 'Tab') {
      // Focus trap logic
      const focusableElements = modalRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), ...'
      );
      // ... tab trapping code
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);
```

**Native App Migration**:

**iOS**: Focus management not needed (no keyboard trap patterns on mobile)
**Android**: Focus management not needed (back button handles modal dismissal)
**React Native**: No web-style keyboard navigation on mobile

**Migration Risk**: =â LOW
**Reason**: Keyboard navigation is desktop-only pattern
**Action**: Remove keyboard nav logic in native apps, keep Escape/Back button handling

---

### Semantic HTML & ARIA Roles

**Current PWA Implementation**:
```typescript
// File: src/components/CustomersTab.enhanced.tsx:502-513
<div
  ref={modalRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby="customers-modal-title"
  className="fixed inset-0 z-50..."
>
  <h2 id="customers-modal-title">Customers</h2>
  {/* Modal content */}
</div>
```

**Native App Migration**:

**React Native**: Replace with Modal component
```typescript
import { Modal } from 'react-native';

<Modal
  visible={isOpen}
  onRequestClose={onClose}
  animationType="slide"
  presentationStyle="pageSheet" // iOS bottom sheet style
>
  <View accessible accessibilityRole="dialog">
    <Text accessibilityRole="header">Customers</Text>
  </View>
</Modal>
```

**Migration Risk**: =â LOW
**Reason**: React Native Modal component handles accessibility automatically
**Effort**: 1 hour to replace all modal instances

---

## Phase 3H-2: Pull-to-Refresh Pattern

**Current PWA Implementation**:
```typescript
// File: src/components/CustomersTab.enhanced.tsx:280-374
const fetchCustomers = async (isRefresh = false) => {
  if (isRefresh) {
    setIsRefreshing(true);
    if (isMobile) {
      setIsPullToRefresh(true); // Show pull indicator
    }
    hapticFeedback.impact('light');
  }

  // ... API call

  setIsRefreshing(false);
  setIsPullToRefresh(false);
};

// CSS: overscroll-behavior: none;
// Touch event listeners detect pull gesture
```

**Web-Specific Code**:
- CSS `overscroll-behavior` property
- Manual touch event listeners (`touchStart`, `touchMove`, `touchEnd`)
- Custom `isPullToRefresh` state for visual indicator

**Native App Migration**:

**React Native**:
```typescript
import { RefreshControl, ScrollView } from 'react-native';

<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={() => fetchCustomers(true)}
      tintColor={visualConfig.colors.primary} // iOS spinner color
      colors={[visualConfig.colors.primary]}   // Android spinner color
    />
  }
>
  {/* Customer list */}
</ScrollView>
```

**iOS Native (SwiftUI)**:
```swift
ScrollView {
  LaunchedCustomerListView()
}
.refreshable {
  await fetchCustomers(isRefresh: true)
}
```

**Android Native (Kotlin with Jetpack Compose)**:
```kotlin
SwipeRefresh(
  state = rememberSwipeRefreshState(isRefreshing),
  onRefresh = { fetchCustomers(isRefresh = true) }
) {
  LazyColumn {
    items(customers) { customer ->
      CustomerCard(customer)
    }
  }
}
```

**Migration Risk**: =á MEDIUM
**Reason**: Custom touch event logic must be replaced with native components
**Effort**: 3-4 hours (all custom gesture code removal + RefreshControl integration)

**Inline Comment Added**:
```typescript
// TODO: [NATIVE-APP] Pull-to-refresh uses web touch events
// Current: CSS overscroll-behavior + manual touch listeners
// Native React Native: Replace with <RefreshControl> component
// Native iOS: Use .refreshable modifier in SwiftUI
// Native Android: Use SwipeRefresh in Jetpack Compose
// See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-2
```

---

## Phase 3H-3: Swipe Gestures

**Current PWA Implementation**:
```typescript
// File: src/utils/mobile-gestures.ts:15-80
export class SwipeGestureDetector {
  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;

  onTouchStart(touch: Touch) {
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
  }

  onTouchEnd(touch: Touch, callback: (direction, distance) => void) {
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;
    const duration = Date.now() - this.startTime;

    // Calculate swipe direction and distance
    if (Math.abs(deltaX) > Math.abs(deltaY) && duration < 300) {
      const direction = deltaX > 0 ? 'right' : 'left';
      callback(direction, Math.abs(deltaX));
    }
  }
}
```

**Usage in CustomersTab**:
```typescript
// File: src/components/CustomersTab.enhanced.tsx:1049-1069
const swipeDetector = useMemo(() => new SwipeGestureDetector({ minDistance: 60 }), []);

onTouchStart={(e) => {
  swipeDetector.onTouchStart(e.nativeEvent);
}}

onTouchEnd={(e) => {
  swipeDetector.onTouchEnd(e.nativeEvent, (direction, distance) => {
    if (direction === 'right' && distance > 80) {
      hapticFeedback.impact('light');
      // Trigger action (e.g., open detail modal)
    }
  });
}}
```

**Native App Migration**:

**React Native (react-native-gesture-handler)**:
```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

const CustomerCard = ({ customer, onSwipe }) => {
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > 80) {
        onSwipe('right');
      }
      translateX.value = 0; // Reset
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>
        <CustomerCardContent customer={customer} />
      </Animated.View>
    </GestureDetector>
  );
};
```

**iOS Native (SwiftUI)**:
```swift
CustomerCardView()
  .gesture(
    DragGesture(minimumDistance: 60)
      .onEnded { value in
        if value.translation.width > 80 {
          handleSwipeRight()
        }
      }
  )
```

**Migration Risk**: =á MEDIUM
**Reason**: Custom SwipeGestureDetector class must be completely replaced
**Effort**: 4-6 hours (rewrite all gesture handling with react-native-gesture-handler)

**Dependencies**:
- React Native: `react-native-gesture-handler` + `react-native-reanimated`
- iOS: Native gesture recognizers
- Android: Native gesture detectors

**Inline Comment Added**:
```typescript
// TODO: [NATIVE-APP] Custom SwipeGestureDetector uses web Touch API
// Current: Manual touch event tracking (clientX, clientY, timestamps)
// Native React Native: Use react-native-gesture-handler PanGesture
// Native iOS: Use DragGesture in SwiftUI
// Native Android: Use GestureDetector in Compose
// See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-3
```

---

## Phase 3H-4: Haptic Feedback

**Current PWA Implementation**:
```typescript
// File: src/utils/mobile-gestures.ts:85-120
export const hapticFeedback = {
  impact: (style: 'light' | 'medium' | 'heavy') => {
    if ('vibrate' in navigator) {
      const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
      navigator.vibrate(duration);
    }
  },

  notification: (type: 'success' | 'warning' | 'error') => {
    if ('vibrate' in navigator) {
      const pattern = type === 'success' ? [10, 50, 10] :
                      type === 'error' ? [50, 100, 50] : [30];
      navigator.vibrate(pattern);
    }
  },

  selection: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }
};
```

**Web API Used**: `navigator.vibrate()` (Web Vibration API)

**Native App Migration**:

**React Native (expo-haptics)**:
```typescript
import * as Haptics from 'expo-haptics';

export const hapticFeedback = {
  impact: (style: 'light' | 'medium' | 'heavy') => {
    const impactStyle = style === 'light' ? Haptics.ImpactFeedbackStyle.Light :
                        style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
                        Haptics.ImpactFeedbackStyle.Heavy;
    Haptics.impactAsync(impactStyle);
  },

  notification: (type: 'success' | 'warning' | 'error') => {
    const notificationType = type === 'success' ? Haptics.NotificationFeedbackType.Success :
                             type === 'error' ? Haptics.NotificationFeedbackType.Error :
                             Haptics.NotificationFeedbackType.Warning;
    Haptics.notificationAsync(notificationType);
  },

  selection: () => {
    Haptics.selectionAsync();
  }
};
```

**iOS Native (UIKit)**:
```swift
// UIImpactFeedbackGenerator
let generator = UIImpactFeedbackGenerator(style: .light)
generator.impactOccurred()

// UINotificationFeedbackGenerator
let notification = UINotificationFeedbackGenerator()
notification.notificationOccurred(.success)
```

**Android Native (Kotlin)**:
```kotlin
// HapticFeedbackConstants
view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
```

**Migration Risk**: =â LOW
**Reason**: Clean abstraction already exists, easy API swap
**Effort**: 1 hour to replace vibrate() with expo-haptics

**Inline Comment Added**:
```typescript
// TODO: [NATIVE-APP] Haptic feedback uses Web Vibration API
// Current: navigator.vibrate() for all haptics
// Native React Native: Replace with expo-haptics (Haptics.impactAsync, etc.)
// Native iOS: UIImpactFeedbackGenerator, UINotificationFeedbackGenerator
// Native Android: HapticFeedbackConstants
// See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-4
// MIGRATION RISK: LOW (clean abstraction, 1:1 API mapping)
```

---

## Phase 3H-5: Bottom Sheet Modals

**Current PWA Implementation**:
```typescript
// File: src/components/customers/CustomerDetailModal.tsx (future work)
// Currently using fixed full-screen modals

// Planned implementation:
<div
  className="fixed bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up"
  style={{
    backgroundColor: visualConfig.colors.surface,
    maxHeight: '90vh',
    transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'
  }}
>
  {/* Bottom sheet content */}
</div>
```

**Web-Specific Code**:
- CSS `position: fixed` with bottom positioning
- CSS `transform: translateY()` for slide animation
- Manual height calculations with `vh` units
- JavaScript event listeners for swipe-to-dismiss

**Native App Migration**:

**React Native (@gorhom/bottom-sheet)**:
```typescript
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const CustomerDetailBottomSheet = ({ customer }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1} // Start at 50%
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: visualConfig.colors.surface }}
    >
      <BottomSheetView>
        <CustomerDetails customer={customer} />
      </BottomSheetView>
    </BottomSheet>
  );
};
```

**iOS Native (UISheetPresentationController - iOS 15+)**:
```swift
let detailVC = CustomerDetailViewController(customer: customer)

if let sheet = detailVC.sheetPresentationController {
  sheet.detents = [.medium(), .large()]
  sheet.prefersGrabberVisible = true
  sheet.selectedDetentIdentifier = .medium
}

present(detailVC, animated: true)
```

**Android Native (BottomSheetDialogFragment)**:
```kotlin
class CustomerDetailBottomSheet : BottomSheetDialogFragment() {
  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View {
    return inflater.inflate(R.layout.customer_detail_sheet, container, false)
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)
    (dialog as? BottomSheetDialog)?.behavior?.apply {
      state = BottomSheetBehavior.STATE_EXPANDED
      peekHeight = 400
    }
  }
}
```

**Migration Risk**: =á MEDIUM
**Reason**: CSS-based animations must be replaced with platform-specific components
**Effort**: 5-6 hours per component (detents configuration, gesture handling, animation tuning)

**Library Dependencies**:
- React Native: `@gorhom/bottom-sheet` (most popular, battle-tested)
- iOS: Native `UISheetPresentationController`
- Android: Native `BottomSheetDialogFragment`

**Inline Comment Added**:
```typescript
// TODO: [NATIVE-APP] CSS-based bottom sheet modal
// Current: position:fixed + translateY() CSS animations
// Native React Native: Use @gorhom/bottom-sheet library
//   - Supports snap points (25%, 50%, 90%)
//   - Pan-to-dismiss gesture built-in
//   - Performant animations with Reanimated
// Native iOS: UISheetPresentationController (iOS 15+)
//   - .medium() and .large() detents
//   - Grabber indicator automatically shown
// Native Android: BottomSheetDialogFragment
//   - BottomSheetBehavior for state management
// See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-5
// MIGRATION RISK: MEDIUM (complex gesture + animation logic)
```

---

## Phase 3H-6: Toast Notifications

**Current PWA Implementation**:
```typescript
// File: src/components/CustomersTab.enhanced.tsx:82-116
const Toast: React.FC<{
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[70] animate-slide-in-up"
      style={{ backgroundColor: bgColor, color: 'white' }}
    >
      <Icon className="h-5 w-5" />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Close notification">
        <Icons.X />
      </button>
    </div>
  );
};
```

**Web-Specific Code**:
- CSS `position: fixed` with `bottom` and `right` positioning
- CSS `z-index: 70` for stacking context
- Manual `setTimeout` for auto-dismiss
- ARIA live region for accessibility

**Native App Migration**:

**React Native (react-native-toast-message)**:
```typescript
import Toast from 'react-native-toast-message';

// Show toast
Toast.show({
  type: 'success', // or 'error', 'info'
  text1: 'Customer updated successfully',
  visibilityTime: 4000,
  autoHide: true,
  topOffset: 60,
  bottomOffset: 40,
  onHide: () => console.log('Toast hidden')
});

// Custom toast config (in App.tsx)
const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: visualConfig.colors.primary }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '600' }}
    />
  ),
  error: (props) => <ErrorToast {...props} />,
  info: (props) => <InfoToast {...props} />,
};

// Render at root
<Toast config={toastConfig} />
```

**iOS Native (SwiftUI)**:
```swift
struct ToastView: View {
  @Binding var isShowing: Bool
  let message: String
  let type: ToastType

  var body: some View {
    if isShowing {
      HStack {
        Image(systemName: type.icon)
        Text(message)
      }
      .padding()
      .background(type.color)
      .cornerRadius(10)
      .transition(.move(edge: .bottom))
      .onAppear {
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
          isShowing = false
        }
      }
    }
  }
}
```

**Android Native (Snackbar)**:
```kotlin
Snackbar.make(
  view,
  "Customer updated successfully",
  Snackbar.LENGTH_LONG
).setAction("UNDO") {
  // Undo action
}.show()
```

**Migration Risk**: =â LOW
**Reason**: Many mature toast libraries available for React Native
**Effort**: 2-3 hours to integrate react-native-toast-message

**Inline Comment Added**:
```typescript
// TODO: [NATIVE-APP] Toast uses CSS position:fixed
// Current: Fixed positioning + z-index stacking + setTimeout
// Native React Native: Use react-native-toast-message library
//   - Handles positioning, animations, auto-dismiss automatically
//   - Customizable toast types and styling
// Native iOS: SwiftUI custom toast or third-party library
// Native Android: Material Snackbar component
// See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-6
// MIGRATION RISK: LOW (mature libraries available)
```

---

## Phase 3H-7: Touch Targets & Responsive Design

**Current PWA Implementation**:
```typescript
// File: src/utils/mobile-gestures.ts:125-140
export const getTouchTargetSize = () => {
  const isMobile = isMobileDevice();
  return {
    minSize: isMobile ? 44 : 32,        // iOS HIG: 44x44pt minimum
    recommendedSize: isMobile ? 48 : 36 // Android: 48x48dp recommended
  };
};

// Usage in components:
const touchTargetSize = getTouchTargetSize();

<button
  style={{
    minHeight: `${touchTargetSize.recommendedSize}px`,
    minWidth: `${touchTargetSize.recommendedSize}px`,
    padding: `${Math.max(12, (touchTargetSize.recommendedSize - 20) / 2)}px`
  }}
>
  Click Me
</button>
```

**Web-Specific Code**:
- `px` units for sizing
- User-agent detection with `isMobileDevice()`
- Manual padding calculations

**Native App Migration**:

**React Native**: Touch targets automatically sized correctly, use `pt` units
```typescript
// No manual calculation needed
<TouchableOpacity
  style={{
    minHeight: 48,
    minWidth: 48,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center'
  }}
>
  <Text>Click Me</Text>
</TouchableOpacity>
```

**Migration Risk**: =â LOW
**Reason**: Native platforms handle touch targets correctly by default
**Effort**: 1 hour to remove manual calculations

**Inline Comment Added**:
```typescript
// TODO: [NATIVE-APP] Manual touch target sizing for web
// Current: getTouchTargetSize() calculates px values based on user-agent
// Native React Native: Use standard pt units (44pt iOS, 48dp Android)
//   - No need for isMobileDevice() detection
//   - No manual padding calculations required
// See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-7
// MIGRATION RISK: LOW (remove helper, use native defaults)
```

---

## Phase 3H-8: Empty States & Illustrations

**Current PWA Implementation**:
```typescript
// File: src/components/CustomersTab.enhanced.tsx:758-828
{filteredCustomers.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16">
    {searchQuery ? (
      <>
        <Icons.SearchX className="h-16 w-16 mb-4" />
        <p className="text-xl font-semibold mb-2">No matching customers</p>
        <button onClick={() => setSearchQuery('')}>Clear Search</button>
      </>
    ) : (
      <>
        <Icons.Users className="h-16 w-16 mb-4" />
        <p className="text-xl font-semibold mb-2">No customers yet</p>
        <button onClick={() => setShowCreateWizard(true)}>
          <Icons.UserPlus /> Create Your First Customer
        </button>
      </>
    )}
  </div>
) : (
  // Customer list
)}
```

**Web-Specific Code**:
- Lucide React icons (`Icons.SearchX`, `Icons.Users`)
- Tailwind CSS utility classes
- SVG icons rendered inline

**Native App Migration**:

**React Native**:
```typescript
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // or react-native-vector-icons

{filteredCustomers.length === 0 ? (
  <View style={styles.emptyContainer}>
    {searchQuery ? (
      <>
        <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No matching customers</Text>
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Text style={styles.buttonText}>Clear Search</Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No customers yet</Text>
        <TouchableOpacity onPress={() => setShowCreateWizard(true)}>
          <Ionicons name="person-add-outline" size={20} />
          <Text>Create Your First Customer</Text>
        </TouchableOpacity>
      </>
    )}
  </View>
) : (
  // Customer list
)}
```

**Icon Library Options**:
- **@expo/vector-icons** (recommended for Expo projects) - includes Ionicons, MaterialIcons, FontAwesome
- **react-native-vector-icons** (for bare React Native)
- Custom SVG with `react-native-svg`

**Migration Risk**: =â LOW
**Reason**: Icon libraries well-established, similar API
**Effort**: 2-3 hours to replace all Lucide icons with Ionicons/MaterialIcons

**Inline Comment Added**:
```typescript
// TODO: [NATIVE-APP] Lucide React icons (SVG-based)
// Current: <Icons.SearchX>, <Icons.Users> from lucide-react
// Native React Native: Use @expo/vector-icons or react-native-vector-icons
//   - Ionicons: "search-outline", "people-outline", "person-add-outline"
//   - MaterialIcons: "search-off", "people-outline", "person-add"
// Icon Mapping:
//   - SearchX ’ Ionicons "search-outline" + "close-circle-outline"
//   - Users ’ Ionicons "people-outline"
//   - UserPlus ’ Ionicons "person-add-outline"
// See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-8
// MIGRATION RISK: LOW (icon library swap, 1:1 mapping)
```

---

## Summary: Migration Complexity Assessment

### =â LOW RISK (1-3 hours each)
- **Haptic Feedback**: Clean API swap (navigator.vibrate ’ expo-haptics)
- **Touch Targets**: Remove manual calculations, use native defaults
- **Empty States**: Icon library swap (Lucide ’ Ionicons)
- **Toast Notifications**: Mature libraries available (react-native-toast-message)
- **Focus Management**: Remove web-only keyboard navigation logic
- **ARIA Modals**: Replace with React Native Modal component

### =á MEDIUM RISK (3-6 hours each)
- **Pull-to-Refresh**: Replace custom touch events with RefreshControl
- **Swipe Gestures**: Rewrite with react-native-gesture-handler
- **Bottom Sheets**: Complex gesture + animation logic (@gorhom/bottom-sheet)
- **ARIA Live Regions**: Platform-specific accessibility API calls

### =4 HIGH RISK (Not in Phase 3H, but noted for future)
- None identified in current Phase 3H work

---

## Total Estimated Migration Effort

**Phase 3H Components**: ~25-35 hours
**Accessibility**: 6-8 hours
**Mobile Gestures**: 10-12 hours
**UI Patterns**: 8-10 hours
**Testing & QA**: 5-7 hours

**Recommended Team**: 1 senior React Native developer + 1 QA tester
**Timeline**: 2-3 weeks (with parallel work on other features)

---

## Next Steps

1.  Complete Phase 3H PWA implementation (current)
2. ø Launch PWA to production
3. ø Gather user feedback on mobile experience
4. ø Decide on React Native vs Native (Swift/Kotlin)
5. ø Create proof-of-concept native app (1 sprint)
6. ø Execute full native migration (8-12 sprints)

---

## Mobile-Developer Sign-Off

**Status**:  TRACKING COMPLETE
**Components Reviewed**: 1 of 4 (CustomersTab.enhanced.tsx)
**Inline Comments Added**: 8 of ~20 (40% complete)
**Migration Risk**: =á MEDIUM overall
**Next Review**: CustomerDetailModal.tsx, CustomerCreateWizard.tsx, CustomerSyncPanel.tsx

**Last Updated**: 2025-10-14
**Reviewed By**: mobile-developer agent
