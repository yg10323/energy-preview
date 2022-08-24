
// This file implements a stable, adapative merge sort variant called TimSort.
//
// It was first implemented in python and this Torque implementation
// is based on the current version:
//
// https://github.com/python/cpython/blob/master/Objects/listobject.c
//
// Detailed analysis and a description of the algorithm can be found at:
//
// https://github.com/python/cpython/blob/master/Objects/listsort.txt

namespace array {
  class SortState extends HeapObject {
  macro Compare (implicit context: Context)(x: JSAny, y: JSAny): Number {
    const sortCompare: CompareBuiltinFn = this.sortComparePtr;
    return sortCompare(context, this.userCmpFn, x, y);
  }

  macro CheckAccessor(implicit context: Context)(): void labels Bailout {
    if (!IsFastJSArray(this.receiver, context)) goto Bailout;

    const canUseSameAccessorFn: CanUseSameAccessorFn =
      this.canUseSameAccessorFn;

    if (!canUseSameAccessorFn(
      context, this.receiver, this.initialReceiverMap,
      this.initialReceiverLength)) {
      goto Bailout;
    }
  }

  macro ResetToGenericAccessor(): void {
    this.loadFn = Load<GenericElementsAccessor>;
    this.storeFn = Store<GenericElementsAccessor>;
    this.deleteFn = Delete<GenericElementsAccessor>;
  }

  // The receiver of the Array.p.sort call.
  receiver: JSReceiver;

  // The initial map and length of the receiver. After calling into JS, these
  // are reloaded and checked. If they changed we bail to the baseline
  // GenericElementsAccessor.
  initialReceiverMap: Map;
  initialReceiverLength: Number;

  // If the user provided a comparison function, it is stored here.
  userCmpFn: Undefined | Callable;

  // Function pointer to the comparison function. This can either be a builtin
  // that calls the user-provided comparison function or "SortDefault", which
  // uses ToString and a lexicographical compare.
  sortComparePtr: CompareBuiltinFn;

  // The following four function pointer represent a Accessor/Path.
  // These are used to Load/Store/Delete elements and to check whether
  // to bail to the baseline GenericElementsAccessor.
  loadFn: LoadFn;
  storeFn: StoreFn;
  deleteFn: DeleteFn;
  canUseSameAccessorFn: CanUseSameAccessorFn;

  // This controls when we get *into* galloping mode. It's initialized to
  // kMinGallop. mergeLow and mergeHigh tend to nudge it higher for random
  // data, and lower for highly structured data.
  minGallop: Smi;

  // A stack of sortState.pendingRunsSize pending runs yet to be merged.
  // Run #i starts at sortState.pendingRuns[2 * i] and extends for
  // sortState.pendingRuns[2 * i + 1] elements:
  //
  //   [..., base (i-1), length (i-1), base i, length i]
  //
  // It's always true (so long as the indices are in bounds) that
  //
  //   base of run #i + length of run #i == base of run #i + 1
  //
  pendingRunsSize: Smi;
  pendingRuns: FixedArray;

  // This is a copy of the original array/object that needs sorting.
  // workArray is never exposed to user-code, and as such cannot change
  // shape and won't be left-trimmed.
  workArray: FixedArray;

  // Pointer to the temporary array.
  tempArray: FixedArray;

  // The initialReceiverLength converted and clamped to Smi.
  sortLength: Smi;

  // The number of undefined that need to be inserted after sorting
  // when the elements are copied back from the workArray to the receiver.
  numberOfUndefined: Smi;
}

type FastSmiElements extends ElementsKind;
type FastObjectElements extends ElementsKind;

// With the pre-processing step in Torque, the exact number of elements
// to sort is unknown at the time the sort state is created.
// The 'length' property is an upper bound (as per spec),
// while the actual size of the backing store is a good guess.
// After the pre-processing step, the workarray won't change in length.
macro CalculateWorkArrayLength(
  receiver: JSReceiver, initialReceiverLength: Number): intptr {
  // TODO(szuend): Implement full range sorting, not only up to MaxSmi.
  //               https://crbug.com/v8/7970.
  let clampedReceiverLength: uintptr;
  try {
    clampedReceiverLength =
      ChangeSafeIntegerNumberToUintPtr(initialReceiverLength)
        otherwise UIntPtrOverflow;
    if (clampedReceiverLength > kSmiMaxValue) {
      clampedReceiverLength = kSmiMaxValue;
    }
  } label UIntPtrOverflow {
    clampedReceiverLength = kSmiMaxValue;
  }

  let workArrayLength: intptr = Convert<intptr>(clampedReceiverLength);
  try {
    const object = Cast<JSObject>(receiver) otherwise NoJsObject;
    const elementsLength = Convert<intptr>(object.elements.length);

    // In some cases, elements are only on prototypes, but not on the receiver
    // itself. Do nothing then, as {workArrayLength} got initialized with the
    // {length} property.
    if (elementsLength != 0) {
      workArrayLength = IntPtrMin(workArrayLength, elementsLength);
    }
  } label NoJsObject { }

  return workArrayLength;
}

transitioning macro NewSortState(implicit context: Context)(
  receiver: JSReceiver, comparefn: Undefined | Callable,
  initialReceiverLength: Number): SortState {
  const sortComparePtr =
    comparefn != Undefined ? SortCompareUserFn : SortCompareDefault;
  const map = receiver.map;
  let loadFn: LoadFn;
  let storeFn: StoreFn;
  let deleteFn: DeleteFn;
  let canUseSameAccessorFn: CanUseSameAccessorFn;

  try {
    const a: FastJSArray = Cast<FastJSArray>(receiver) otherwise Slow;

    // Copy copy-on-write (COW) arrays.
    array:: EnsureWriteableFastElements(a);

    const elementsKind: ElementsKind = map.elements_kind;
    if (IsDoubleElementsKind(elementsKind)) {
      loadFn = Load<FastDoubleElements>;
      storeFn = Store<FastDoubleElements>;
      deleteFn = Delete<FastDoubleElements>;
      canUseSameAccessorFn = CanUseSameAccessor<FastDoubleElements>;
    } else if (IsFastSmiElementsKind(elementsKind)) {
      loadFn = Load<FastSmiElements>;
      storeFn = Store<FastSmiElements>;
      deleteFn = Delete<FastSmiElements>;
      canUseSameAccessorFn = CanUseSameAccessor<FastSmiElements>;
    } else {
      loadFn = Load<FastObjectElements>;
      storeFn = Store<FastObjectElements>;
      deleteFn = Delete<FastObjectElements>;
      canUseSameAccessorFn = CanUseSameAccessor<FastObjectElements>;
    }
  } label Slow {
    loadFn = Load<GenericElementsAccessor>;
    storeFn = Store<GenericElementsAccessor>;
    deleteFn = Delete<GenericElementsAccessor>;
    canUseSameAccessorFn = CanUseSameAccessor<GenericElementsAccessor>;
  }

  const workArrayLength =
    CalculateWorkArrayLength(receiver, initialReceiverLength);

  return new SortState{
    receiver,
      initialReceiverMap: map,
        initialReceiverLength,
        userCmpFn: comparefn,
          sortComparePtr,
          loadFn,
          storeFn,
          deleteFn,
          canUseSameAccessorFn,
          minGallop: kMinGallopWins,
            pendingRunsSize: 0,
              pendingRuns: AllocateZeroedFixedArray(Convert<intptr>(kMaxMergePending)),
                workArray: AllocateZeroedFixedArray(workArrayLength),
                  tempArray: kEmptyFixedArray,
                    sortLength: 0,
                      numberOfUndefined: 0
  };
}

const kSuccess: Smi = 0;

// The maximum number of entries in a SortState's pending-runs stack.
// This is enough to sort arrays of size up to about
//   32 * phi ** kMaxMergePending
// where phi ~= 1.618. 85 is ridiculously large enough, good for an array with
// 2 ** 64 elements.
const kMaxMergePending: constexpr int31 = 85;

// When we get into galloping mode, we stay there until both runs win less
// often then kMinGallop consecutive times. See listsort.txt for more info.
const kMinGallopWins: constexpr int31 = 7;

// Default size of the temporary array. The temporary array is allocated when
// it is first requested, but it has always at least this size.
const kSortStateTempSize: Smi = 32;

type LoadFn = builtin(Context, SortState, Smi) => (JSAny | TheHole);
type StoreFn = builtin(Context, SortState, Smi, JSAny) => Smi;
type DeleteFn = builtin(Context, SortState, Smi) => Smi;
type CanUseSameAccessorFn = builtin(Context, JSReceiver, Map, Number) =>
  Boolean;
type CompareBuiltinFn = builtin(Context, JSAny, JSAny, JSAny) => Number;

// The following builtins implement Load/Store for all the Accessors.
// The most generic baseline version uses Get-/SetProperty. We do not need
// to worry about the prototype chain, because the pre-processing step has
// copied values from the prototype chain to the receiver if they were visible
// through a hole.

transitioning builtin Load < ElementsAccessor : type extends ElementsKind > (
  context: Context, sortState: SortState, index: Smi): JSAny | TheHole {
  const receiver = sortState.receiver;
  if (!HasProperty_Inline(receiver, index)) return TheHole;
  return GetProperty(receiver, index);
}

Load<FastSmiElements>(
  context: Context, sortState: SortState, index: Smi): JSAny | TheHole {
  const object = UnsafeCast<JSObject>(sortState.receiver);
  const elements = UnsafeCast<FixedArray>(object.elements);
  return UnsafeCast<(JSAny | TheHole)>(elements.objects[index]);
}

Load<FastObjectElements>(
  context: Context, sortState: SortState, index: Smi): JSAny | TheHole {
  const object = UnsafeCast<JSObject>(sortState.receiver);
  const elements = UnsafeCast<FixedArray>(object.elements);
  return UnsafeCast<(JSAny | TheHole)>(elements.objects[index]);
}

Load<FastDoubleElements>(
  context: Context, sortState: SortState, index: Smi): JSAny | TheHole {
  try {
    const object = UnsafeCast<JSObject>(sortState.receiver);
    const elements = UnsafeCast<FixedDoubleArray>(object.elements);
    const value = elements.floats[index].Value() otherwise IfHole;
    return AllocateHeapNumberWithValue(value);
  } label IfHole {
    return TheHole;
  }
}

transitioning builtin Store < ElementsAccessor : type extends ElementsKind > (
  context: Context, sortState: SortState, index: Smi, value: JSAny): Smi {
  SetProperty(sortState.receiver, index, value);
  return kSuccess;
}

Store<FastSmiElements>(
  context: Context, sortState: SortState, index: Smi, value: JSAny): Smi {
  const object = UnsafeCast<JSObject>(sortState.receiver);
  const elements = UnsafeCast<FixedArray>(object.elements);
  const value = UnsafeCast<Smi>(value);
  StoreFixedArrayElement(elements, index, value);
  return kSuccess;
}

Store<FastObjectElements>(
  context: Context, sortState: SortState, index: Smi, value: JSAny): Smi {
  const object = UnsafeCast<JSObject>(sortState.receiver);
  const elements = UnsafeCast<FixedArray>(object.elements);
  elements.objects[index] = value;
  return kSuccess;
}

Store<FastDoubleElements>(
  context: Context, sortState: SortState, index: Smi, value: JSAny): Smi {
  const object = UnsafeCast<JSObject>(sortState.receiver);
  const elements = UnsafeCast<FixedDoubleArray>(object.elements);
  const heapVal = UnsafeCast<HeapNumber>(value);
  const val = Convert<float64>(heapVal);
  StoreFixedDoubleArrayElement(elements, index, val);
  return kSuccess;
}

transitioning builtin Delete < ElementsAccessor : type extends ElementsKind > (
  context: Context, sortState: SortState, index: Smi): Smi {
  const receiver = sortState.receiver;
  DeleteProperty(receiver, index, LanguageMode:: kStrict);
  return kSuccess;
}

Delete<FastSmiElements>(
  context: Context, sortState: SortState, index: Smi): Smi {
  dcheck(IsHoleyFastElementsKind(sortState.receiver.map.elements_kind));

  const object = UnsafeCast<JSObject>(sortState.receiver);
  const elements = UnsafeCast<FixedArray>(object.elements);
  elements.objects[index] = TheHole;
  return kSuccess;
}

Delete<FastObjectElements>(
  context: Context, sortState: SortState, index: Smi): Smi {
  dcheck(IsHoleyFastElementsKind(sortState.receiver.map.elements_kind));

  const object = UnsafeCast<JSObject>(sortState.receiver);
  const elements = UnsafeCast<FixedArray>(object.elements);
  elements.objects[index] = TheHole;
  return kSuccess;
}

Delete<FastDoubleElements>(
  context: Context, sortState: SortState, index: Smi): Smi {
  dcheck(IsHoleyFastElementsKind(sortState.receiver.map.elements_kind));

  const object = UnsafeCast<JSObject>(sortState.receiver);
  const elements = UnsafeCast<FixedDoubleArray>(object.elements);
  elements.floats[index] = kDoubleHole;
  return kSuccess;
}

transitioning builtin SortCompareDefault(
  context: Context, comparefn: JSAny, x: JSAny, y: JSAny): Number {
  dcheck(comparefn == Undefined);

  if (TaggedIsSmi(x) && TaggedIsSmi(y)) {
    return SmiLexicographicCompare(UnsafeCast<Smi>(x), UnsafeCast<Smi>(y));
  }

  // 5. Let xString be ? ToString(x).
  const xString = ToString_Inline(x);

  // 6. Let yString be ? ToString(y).
  const yString = ToString_Inline(y);

  // 7. Let xSmaller be the result of performing
  //    Abstract Relational Comparison xString < yString.
  // 8. If xSmaller is true, return -1.
  if (StringLessThan(context, xString, yString) == True) return -1;

  // 9. Let ySmaller be the result of performing
  //    Abstract Relational Comparison yString < xString.
  // 10. If ySmaller is true, return 1.
  if (StringLessThan(context, yString, xString) == True) return 1;

  // 11. Return +0.
  return 0;
}

transitioning builtin SortCompareUserFn(
  context: Context, comparefn: JSAny, x: JSAny, y: JSAny): Number {
  dcheck(comparefn != Undefined);
  const cmpfn = UnsafeCast<Callable>(comparefn);

  // a. Let v be ? ToNumber(? Call(comparefn, undefined, x, y)).
  const v = ToNumber_Inline(Call(context, cmpfn, Undefined, x, y));

  // b. If v is NaN, return +0.
  if (NumberIsNaN(v)) return 0;

  // c. return v.
  return v;
}

builtin CanUseSameAccessor < ElementsAccessor : type extends ElementsKind > (
  context: Context, receiver: JSReceiver, initialReceiverMap: Map,
    initialReceiverLength: Number): Boolean {
  if (receiver.map != initialReceiverMap) return False;

  dcheck(TaggedIsSmi(initialReceiverLength));
  const array = UnsafeCast<JSArray>(receiver);
  const originalLength = UnsafeCast<Smi>(initialReceiverLength);

  return SelectBooleanConstant(UnsafeCast<Smi>(array.length) == originalLength);
}

CanUseSameAccessor<GenericElementsAccessor>(
  _context: Context, _receiver: JSReceiver, _initialReceiverMap: Map,
  _initialReceiverLength: Number): Boolean {
  // Do nothing. We are already on the slow path.
  return True;
}

// Re-loading the stack-size is done in a few places. The small macro allows
// for easier invariant checks at all use sites.
macro GetPendingRunsSize(implicit context: Context)(sortState: SortState): Smi {
  const stackSize: Smi = sortState.pendingRunsSize;
  dcheck(stackSize >= 0);
  return stackSize;
}

macro GetPendingRunBase(implicit context: Context)(
  pendingRuns: FixedArray, run: Smi): Smi {
  return UnsafeCast<Smi>(pendingRuns.objects[run << 1]);
}

macro SetPendingRunBase(pendingRuns: FixedArray, run: Smi, value: Smi): void {
  pendingRuns.objects[run << 1] = value;
}

macro GetPendingRunLength(implicit context: Context)(
  pendingRuns: FixedArray, run: Smi): Smi {
  return UnsafeCast<Smi>(pendingRuns.objects[(run << 1) + 1]);
}

macro SetPendingRunLength(pendingRuns: FixedArray, run: Smi, value: Smi): void {
  pendingRuns.objects[(run << 1) + 1] = value;
}

macro PushRun(implicit context: Context)(
  sortState: SortState, base: Smi, length: Smi): void {
    dcheck (GetPendingRunsSize(sortState) < kMaxMergePending);

const stackSize: Smi = GetPendingRunsSize(sortState);
const pendingRuns: FixedArray = sortState.pendingRuns;

SetPendingRunBase(pendingRuns, stackSize, base);
SetPendingRunLength(pendingRuns, stackSize, length);

sortState.pendingRunsSize = stackSize + 1;
}

// Returns the temporary array and makes sure that it is big enough.
// TODO(szuend): Implement a better re-size strategy.
macro GetTempArray(implicit context: Context)(
  sortState: SortState, requestedSize: Smi): FixedArray {
  const minSize: Smi = SmiMax(kSortStateTempSize, requestedSize);

  const currentSize: Smi = sortState.tempArray.length;
  if (currentSize >= minSize) {
    return sortState.tempArray;
  }

  const tempArray: FixedArray =
    AllocateZeroedFixedArray(Convert<intptr>(minSize));

  sortState.tempArray = tempArray;
  return tempArray;
}

transitioning builtin
Copy(implicit context: Context)(
  source: FixedArray, srcPos: Smi, target: FixedArray, dstPos: Smi,
  length: Smi): JSAny {
  dcheck(srcPos >= 0);
  dcheck(dstPos >= 0);
  dcheck(srcPos <= source.length - length);
  dcheck(dstPos <= target.length - length);

  // TODO(szuend): Investigate whether this builtin should be replaced
  //               by CopyElements/MoveElements for perfomance.

  // source and target might be the same array. To avoid overwriting
  // values in the case of overlaping ranges, elements are copied from
  // the back when srcPos < dstPos.
  if (srcPos < dstPos) {
    let srcIdx: Smi = srcPos + length - 1;
    let dstIdx: Smi = dstPos + length - 1;
    while (srcIdx >= srcPos) {
      target.objects[dstIdx--] = source.objects[srcIdx--];
    }
  } else {
    let srcIdx: Smi = srcPos;
    let dstIdx: Smi = dstPos;
    const to: Smi = srcPos + length;

    while (srcIdx < to) {
      target.objects[dstIdx++] = source.objects[srcIdx++];
    }
  }
  return kSuccess;
}

// BinaryInsertionSort is the best method for sorting small arrays: it
// does few compares, but can do data movement quadratic in the number of
// elements. This is an advantage since comparisons are more expensive due
// to calling into JS.
//
//  [low, high) is a contiguous range of a array, and is sorted via
// binary insertion. This sort is stable.
//
// On entry, must have low <= start <= high, and that [low, start) is
// already sorted. Pass start == low if you do not know!.
macro BinaryInsertionSort(implicit context: Context, sortState: SortState)(
  low: Smi, startArg: Smi, high: Smi): void {
    dcheck (low <= startArg && startArg <= high);

const workArray = sortState.workArray;

let start: Smi = low == startArg ? (startArg + 1) : startArg;

for (; start < high; ++start) {
  // Set left to where a[start] belongs.
  let left: Smi = low;
  let right: Smi = start;

  const pivot = UnsafeCast<JSAny>(workArray.objects[right]);

  // Invariants:
  //   pivot >= all in [low, left).
  //   pivot  < all in [right, start).
  dcheck(left < right);

  // Find pivot insertion point.
  while (left < right) {
    const mid: Smi = left + ((right - left) >> 1);
    const order =
      sortState.Compare(pivot, UnsafeCast<JSAny>(workArray.objects[mid]));

    if (order < 0) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  dcheck(left == right);

  // The invariants still hold, so:
  //   pivot >= all in [low, left) and
  //   pivot  < all in [left, start),
  //
  // so pivot belongs at left. Note that if there are elements equal
  // to pivot, left points to the first slot after them -- that's why
  // this sort is stable. Slide over to make room.
  for (let p: Smi = start; p > left; --p) {
    workArray.objects[p] = workArray.objects[p - 1];
  }
  workArray.objects[left] = pivot;
}
}

// Return the length of the run beginning at low, in the range [low,
// high), low < high is required on entry. "A run" is the longest
// ascending sequence, with
//
//   a[low] <= a[low + 1] <= a[low + 2] <= ...
//
// or the longest descending sequence, with
//
//   a[low] > a[low + 1] > a[low + 2] > ...
//
// For its intended use in stable mergesort, the strictness of the
// definition of "descending" is needed so that the range can safely be
// reversed without violating stability (strict ">" ensures there are no
// equal elements to get out of order).
//
// In addition, if the run is "descending", it is reversed, so the
// returned length is always an ascending sequence.
macro CountAndMakeRun(implicit context: Context, sortState: SortState)(
  lowArg: Smi, high: Smi): Smi {
  dcheck(lowArg < high);

  const workArray = sortState.workArray;

  const low: Smi = lowArg + 1;
  if (low == high) return 1;

  let runLength: Smi = 2;

  const elementLow = UnsafeCast<JSAny>(workArray.objects[low]);
  const elementLowPred = UnsafeCast<JSAny>(workArray.objects[low - 1]);
  let order = sortState.Compare(elementLow, elementLowPred);

  // TODO(szuend): Replace with "order < 0" once Torque supports it.
  //               Currently the operator<(Number, Number) has return type
  //               'never' and uses two labels to branch.
  const isDescending: bool = order < 0 ? true : false;

  let previousElement: JSAny = elementLow;
  for (let idx: Smi = low + 1; idx < high; ++idx) {
    const currentElement = UnsafeCast<JSAny>(workArray.objects[idx]);
    order = sortState.Compare(currentElement, previousElement);

    if (isDescending) {
      if (order >= 0) break;
    } else {
      if (order < 0) break;
    }

    previousElement = currentElement;
    ++runLength;
  }

  if (isDescending) {
    ReverseRange(workArray, lowArg, lowArg + runLength);
  }

  return runLength;
}

macro ReverseRange(array: FixedArray, from: Smi, to: Smi): void {
  let low: Smi = from;
  let high: Smi = to - 1;

  while (low <high) {
    const elementLow = array.objects[low];
    const elementHigh = array.objects[high];
    array.objects[low++] = elementHigh;
    array.objects[high--] = elementLow;
  }
}

// Merges the two runs at stack indices i and i + 1.
// Returns kFailure if we need to bailout, kSuccess otherwise.
transitioning builtin
MergeAt(implicit context: Context, sortState: SortState)(i: Smi): Smi {
  const stackSize: Smi = GetPendingRunsSize(sortState);

  // We are only allowed to either merge the two top-most runs, or leave
  // the top most run alone and merge the two next runs.
  dcheck(stackSize >= 2);
  dcheck(i >= 0);
  dcheck(i == stackSize - 2 || i == stackSize - 3);

  const workArray = sortState.workArray;

  const pendingRuns: FixedArray = sortState.pendingRuns;
  let baseA: Smi = GetPendingRunBase(pendingRuns, i);
  let lengthA: Smi = GetPendingRunLength(pendingRuns, i);
  const baseB: Smi = GetPendingRunBase(pendingRuns, i + 1);
  let lengthB: Smi = GetPendingRunLength(pendingRuns, i + 1);
  dcheck(lengthA > 0 && lengthB > 0);
  dcheck(baseA + lengthA == baseB);

  // Record the length of the combined runs; if i is the 3rd-last run now,
  // also slide over the last run (which isn't involved in this merge).
  // The current run i + 1 goes away in any case.
  SetPendingRunLength(pendingRuns, i, lengthA + lengthB);
  if (i == stackSize - 3) {
    const base: Smi = GetPendingRunBase(pendingRuns, i + 2);
    const length: Smi = GetPendingRunLength(pendingRuns, i + 2);
    SetPendingRunBase(pendingRuns, i + 1, base);
    SetPendingRunLength(pendingRuns, i + 1, length);
  }
  sortState.pendingRunsSize = stackSize - 1;

  // Where does b start in a? Elements in a before that can be ignored,
  // because they are already in place.
  const keyRight = UnsafeCast<JSAny>(workArray.objects[baseB]);
  const k: Smi = GallopRight(workArray, keyRight, baseA, lengthA, 0);
  dcheck(k >= 0);

  baseA = baseA + k;
  lengthA = lengthA - k;
  if (lengthA == 0) return kSuccess;
  dcheck(lengthA > 0);

  // Where does a end in b? Elements in b after that can be ignored,
  // because they are already in place.
  const keyLeft = UnsafeCast<JSAny>(workArray.objects[baseA + lengthA - 1]);
  lengthB = GallopLeft(workArray, keyLeft, baseB, lengthB, lengthB - 1);
  dcheck(lengthB >= 0);
  if (lengthB == 0) return kSuccess;

  // Merge what remains of the runs, using a temp array with
  // min(lengthA, lengthB) elements.
  if (lengthA <= lengthB) {
    MergeLow(baseA, lengthA, baseB, lengthB);
  } else {
    MergeHigh(baseA, lengthA, baseB, lengthB);
  }
  return kSuccess;
}

// Locates the proper position of key in a sorted array; if the array
// contains an element equal to key, return the position immediately to
// the left of the leftmost equal element. (GallopRight does the same
// except returns the position to the right of the rightmost equal element
// (if any)).
//
// The array is sorted with "length" elements, starting at "base".
// "length" must be > 0.
//
// "hint" is an index at which to begin the search, 0 <= hint < n. The
// closer hint is to the final result, the faster this runs.
//
// The return value is the int offset in 0..length such that
//
// array[base + offset] < key <= array[base + offset + 1]
//
// pretending that array[base - 1] is minus infinity and array[base + len]
// is plus infinity. In other words, key belongs at index base + k.
builtin GallopLeft(implicit context: Context, sortState: SortState)(
  array: FixedArray, key: JSAny, base: Smi, length: Smi, hint: Smi): Smi {
  dcheck(length > 0 && base >= 0);
  dcheck(0 <= hint && hint < length);

  let lastOfs: Smi = 0;
  let offset: Smi = 1;

  const baseHintElement = UnsafeCast<JSAny>(array.objects[base + hint]);
  let order = sortState.Compare(baseHintElement, key);

  if (order < 0) {
    // a[base + hint] < key: gallop right, until
    // a[base + hint + lastOfs] < key <= a[base + hint + offset].

    // a[base + length - 1] is highest.
    const maxOfs: Smi = length - hint;
    while (offset < maxOfs) {
      const offsetElement =
        UnsafeCast<JSAny>(array.objects[base + hint + offset]);
      order = sortState.Compare(offsetElement, key);

      // a[base + hint + offset] >= key? Break.
      if (order >= 0) break;

      lastOfs = offset;
      offset = (offset << 1) + 1;

      // Integer overflow.
      if (offset <= 0) offset = maxOfs;
    }

    if (offset > maxOfs) offset = maxOfs;

    // Translate back to positive offsets relative to base.
    lastOfs = lastOfs + hint;
    offset = offset + hint;
  } else {
    // key <= a[base + hint]: gallop left, until
    // a[base + hint - offset] < key <= a[base + hint - lastOfs].
    dcheck(order >= 0);

    // a[base + hint] is lowest.
    const maxOfs: Smi = hint + 1;
    while (offset < maxOfs) {
      const offsetElement =
        UnsafeCast<JSAny>(array.objects[base + hint - offset]);
      order = sortState.Compare(offsetElement, key);

      if (order < 0) break;

      lastOfs = offset;
      offset = (offset << 1) + 1;

      // Integer overflow.
      if (offset <= 0) offset = maxOfs;
    }

    if (offset > maxOfs) offset = maxOfs;

    // Translate back to positive offsets relative to base.
    const tmp: Smi = lastOfs;
    lastOfs = hint - offset;
    offset = hint - tmp;
  }

  dcheck(-1 <= lastOfs && lastOfs < offset && offset <= length);

  // Now a[base+lastOfs] < key <= a[base+offset], so key belongs
  // somewhere to the right of lastOfs but no farther right than offset.
  // Do a binary search, with invariant:
  //   a[base + lastOfs - 1] < key <= a[base + offset].
  lastOfs++;
  while (lastOfs < offset) {
    const m: Smi = lastOfs + ((offset - lastOfs) >> 1);

    order = sortState.Compare(UnsafeCast<JSAny>(array.objects[base + m]), key);

    if (order < 0) {
      lastOfs = m + 1;  // a[base + m] < key.
    } else {
      offset = m;  // key <= a[base + m].
    }
  }
  // so a[base + offset - 1] < key <= a[base + offset].
  dcheck(lastOfs == offset);
  dcheck(0 <= offset && offset <= length);
  return offset;
}

// Exactly like GallopLeft, except that if key already exists in
// [base, base + length), finds the position immediately to the right of
// the rightmost equal value.
//
// The return value is the int offset in 0..length such that
//
// array[base + offset - 1] <= key < array[base + offset]
//
// or kFailure on error.
builtin GallopRight(implicit context: Context, sortState: SortState)(
  array: FixedArray, key: JSAny, base: Smi, length: Smi, hint: Smi): Smi {
  dcheck(length > 0 && base >= 0);
  dcheck(0 <= hint && hint < length);

  let lastOfs: Smi = 0;
  let offset: Smi = 1;

  const baseHintElement = UnsafeCast<JSAny>(array.objects[base + hint]);
  let order = sortState.Compare(key, baseHintElement);

  if (order < 0) {
    // key < a[base + hint]: gallop left, until
    // a[base + hint - offset] <= key < a[base + hint - lastOfs].

    // a[base + hint] is lowest.
    const maxOfs: Smi = hint + 1;
    while (offset < maxOfs) {
      const offsetElement =
        UnsafeCast<JSAny>(array.objects[base + hint - offset]);
      order = sortState.Compare(key, offsetElement);

      if (order >= 0) break;

      lastOfs = offset;
      offset = (offset << 1) + 1;

      // Integer overflow.
      if (offset <= 0) offset = maxOfs;
    }

    if (offset > maxOfs) offset = maxOfs;

    // Translate back to positive offsets relative to base.
    const tmp: Smi = lastOfs;
    lastOfs = hint - offset;
    offset = hint - tmp;
  } else {
    // a[base + hint] <= key: gallop right, until
    // a[base + hint + lastOfs] <= key < a[base + hint + offset].

    // a[base + length - 1] is highest.
    const maxOfs: Smi = length - hint;
    while (offset < maxOfs) {
      const offsetElement =
        UnsafeCast<JSAny>(array.objects[base + hint + offset]);
      order = sortState.Compare(key, offsetElement);

      // a[base + hint + ofs] <= key.
      if (order < 0) break;

      lastOfs = offset;
      offset = (offset << 1) + 1;

      // Integer overflow.
      if (offset <= 0) offset = maxOfs;
    }

    if (offset > maxOfs) offset = maxOfs;

    // Translate back to positive offests relative to base.
    lastOfs = lastOfs + hint;
    offset = offset + hint;
  }
  dcheck(-1 <= lastOfs && lastOfs < offset && offset <= length);

  // Now a[base + lastOfs] <= key < a[base + ofs], so key belongs
  // somewhere to the right of lastOfs but no farther right than ofs.
  // Do a binary search, with invariant
  // a[base + lastOfs - 1] < key <= a[base + ofs].
  lastOfs++;
  while (lastOfs < offset) {
    const m: Smi = lastOfs + ((offset - lastOfs) >> 1);

    order = sortState.Compare(key, UnsafeCast<JSAny>(array.objects[base + m]));

    if (order < 0) {
      offset = m;  // key < a[base + m].
    } else {
      lastOfs = m + 1;  // a[base + m] <= key.
    }
  }
  // so a[base + offset - 1] <= key < a[base + offset].
  dcheck(lastOfs == offset);
  dcheck(0 <= offset && offset <= length);
  return offset;
}

// Merge the lengthA elements starting at baseA with the lengthB elements
// starting at baseB in a stable way, in-place. lengthA and lengthB must
// be > 0, and baseA + lengthA == baseB. Must also have that
// array[baseB] < array[baseA],
// that array[baseA + lengthA - 1] belongs at the end of the merge,
// and should have lengthA <= lengthB.
transitioning macro MergeLow(implicit context: Context, sortState: SortState)(
  baseA: Smi, lengthAArg: Smi, baseB: Smi, lengthBArg: Smi): void {
    dcheck (0 <lengthAArg && 0 < lengthBArg);
dcheck(0 <= baseA && 0 < baseB);
dcheck(baseA + lengthAArg == baseB);

let lengthA: Smi = lengthAArg;
let lengthB: Smi = lengthBArg;

const workArray = sortState.workArray;
const tempArray: FixedArray = GetTempArray(sortState, lengthA);
Copy(workArray, baseA, tempArray, 0, lengthA);

let dest: Smi = baseA;
let cursorTemp: Smi = 0;
let cursorB: Smi = baseB;

workArray.objects[dest++] = workArray.objects[cursorB++];

try {
  if (--lengthB == 0) goto Succeed;
  if (lengthA == 1) goto CopyB;

  let minGallop: Smi = sortState.minGallop;
  // TODO(szuend): Replace with something that does not have a runtime
  //               overhead as soon as its available in Torque.
  while (Int32TrueConstant()) {
    let nofWinsA: Smi = 0;  // # of times A won in a row.
    let nofWinsB: Smi = 0;  // # of times B won in a row.

    // Do the straightforward thing until (if ever) one run appears to
    // win consistently.
    // TODO(szuend): Replace with something that does not have a runtime
    //               overhead as soon as its available in Torque.
    while (Int32TrueConstant()) {
      dcheck(lengthA > 1 && lengthB > 0);

      const order = sortState.Compare(
        UnsafeCast<JSAny>(workArray.objects[cursorB]),
        UnsafeCast<JSAny>(tempArray.objects[cursorTemp]));

      if (order < 0) {
        workArray.objects[dest++] = workArray.objects[cursorB++];

        ++nofWinsB;
        --lengthB;
        nofWinsA = 0;

        if (lengthB == 0) goto Succeed;
        if (nofWinsB >= minGallop) break;
      } else {
        workArray.objects[dest++] = tempArray.objects[cursorTemp++];

        ++nofWinsA;
        --lengthA;
        nofWinsB = 0;

        if (lengthA == 1) goto CopyB;
        if (nofWinsA >= minGallop) break;
      }
    }

    // One run is winning so consistently that galloping may be a huge
    // win. So try that, and continue galloping until (if ever) neither
    // run appears to be winning consistently anymore.
    ++minGallop;
    let firstIteration: bool = true;
    while (nofWinsA >= kMinGallopWins || nofWinsB >= kMinGallopWins ||
      firstIteration) {
      firstIteration = false;
      dcheck(lengthA > 1 && lengthB > 0);

      minGallop = SmiMax(1, minGallop - 1);
      sortState.minGallop = minGallop;

      nofWinsA = GallopRight(
        tempArray, UnsafeCast<JSAny>(workArray.objects[cursorB]),
        cursorTemp, lengthA, 0);
      dcheck(nofWinsA >= 0);

      if (nofWinsA > 0) {
        Copy(tempArray, cursorTemp, workArray, dest, nofWinsA);
        dest = dest + nofWinsA;
        cursorTemp = cursorTemp + nofWinsA;
        lengthA = lengthA - nofWinsA;

        if (lengthA == 1) goto CopyB;

        // lengthA == 0 is impossible now if the comparison function is
        // consistent, but we can't assume that it is.
        if (lengthA == 0) goto Succeed;
      }
      workArray.objects[dest++] = workArray.objects[cursorB++];
      if (--lengthB == 0) goto Succeed;

      nofWinsB = GallopLeft(
        workArray, UnsafeCast<JSAny>(tempArray.objects[cursorTemp]),
        cursorB, lengthB, 0);
      dcheck(nofWinsB >= 0);
      if (nofWinsB > 0) {
        Copy(workArray, cursorB, workArray, dest, nofWinsB);

        dest = dest + nofWinsB;
        cursorB = cursorB + nofWinsB;
        lengthB = lengthB - nofWinsB;

        if (lengthB == 0) goto Succeed;
      }
      workArray.objects[dest++] = tempArray.objects[cursorTemp++];
      if (--lengthA == 1) goto CopyB;
    }
    ++minGallop;  // Penalize it for leaving galloping mode
    sortState.minGallop = minGallop;
  }
} label Succeed {
  if (lengthA > 0) {
    Copy(tempArray, cursorTemp, workArray, dest, lengthA);
  }
} label CopyB {
  dcheck(lengthA == 1 && lengthB > 0);
  // The last element of run A belongs at the end of the merge.
  Copy(workArray, cursorB, workArray, dest, lengthB);
  workArray.objects[dest + lengthB] = tempArray.objects[cursorTemp];
}
}

// Merge the lengthA elements starting at baseA with the lengthB elements
// starting at baseB in a stable way, in-place. lengthA and lengthB must
// be > 0. Must also have that array[baseA + lengthA - 1] belongs at the
// end of the merge and should have lengthA >= lengthB.
transitioning macro MergeHigh(implicit context: Context, sortState: SortState)(
  baseA: Smi, lengthAArg: Smi, baseB: Smi, lengthBArg: Smi): void {
    dcheck (0 <lengthAArg && 0 < lengthBArg);
dcheck(0 <= baseA && 0 < baseB);
dcheck(baseA + lengthAArg == baseB);

let lengthA: Smi = lengthAArg;
let lengthB: Smi = lengthBArg;

const workArray = sortState.workArray;
const tempArray: FixedArray = GetTempArray(sortState, lengthB);
Copy(workArray, baseB, tempArray, 0, lengthB);

// MergeHigh merges the two runs backwards.
let dest: Smi = baseB + lengthB - 1;
let cursorTemp: Smi = lengthB - 1;
let cursorA: Smi = baseA + lengthA - 1;

workArray.objects[dest--] = workArray.objects[cursorA--];

try {
  if (--lengthA == 0) goto Succeed;
  if (lengthB == 1) goto CopyA;

  let minGallop: Smi = sortState.minGallop;
  // TODO(szuend): Replace with something that does not have a runtime
  //               overhead as soon as its available in Torque.
  while (Int32TrueConstant()) {
    let nofWinsA: Smi = 0;  // # of times A won in a row.
    let nofWinsB: Smi = 0;  // # of times B won in a row.

    // Do the straightforward thing until (if ever) one run appears to
    // win consistently.
    // TODO(szuend): Replace with something that does not have a runtime
    //               overhead as soon as its available in Torque.
    while (Int32TrueConstant()) {
      dcheck(lengthA > 0 && lengthB > 1);

      const order = sortState.Compare(
        UnsafeCast<JSAny>(tempArray.objects[cursorTemp]),
        UnsafeCast<JSAny>(workArray.objects[cursorA]));

      if (order < 0) {
        workArray.objects[dest--] = workArray.objects[cursorA--];

        ++nofWinsA;
        --lengthA;
        nofWinsB = 0;

        if (lengthA == 0) goto Succeed;
        if (nofWinsA >= minGallop) break;
      } else {
        workArray.objects[dest--] = tempArray.objects[cursorTemp--];

        ++nofWinsB;
        --lengthB;
        nofWinsA = 0;

        if (lengthB == 1) goto CopyA;
        if (nofWinsB >= minGallop) break;
      }
    }

    // One run is winning so consistently that galloping may be a huge
    // win. So try that, and continue galloping until (if ever) neither
    // run appears to be winning consistently anymore.
    ++minGallop;
    let firstIteration: bool = true;
    while (nofWinsA >= kMinGallopWins || nofWinsB >= kMinGallopWins ||
      firstIteration) {
      firstIteration = false;

      dcheck(lengthA > 0 && lengthB > 1);

      minGallop = SmiMax(1, minGallop - 1);
      sortState.minGallop = minGallop;

      let k: Smi = GallopRight(
        workArray, UnsafeCast<JSAny>(tempArray.objects[cursorTemp]), baseA,
        lengthA, lengthA - 1);
      dcheck(k >= 0);
      nofWinsA = lengthA - k;

      if (nofWinsA > 0) {
        dest = dest - nofWinsA;
        cursorA = cursorA - nofWinsA;
        Copy(workArray, cursorA + 1, workArray, dest + 1, nofWinsA);

        lengthA = lengthA - nofWinsA;
        if (lengthA == 0) goto Succeed;
      }
      workArray.objects[dest--] = tempArray.objects[cursorTemp--];
      if (--lengthB == 1) goto CopyA;

      k = GallopLeft(
        tempArray, UnsafeCast<JSAny>(workArray.objects[cursorA]), 0,
        lengthB, lengthB - 1);
      dcheck(k >= 0);
      nofWinsB = lengthB - k;

      if (nofWinsB > 0) {
        dest = dest - nofWinsB;
        cursorTemp = cursorTemp - nofWinsB;
        Copy(tempArray, cursorTemp + 1, workArray, dest + 1, nofWinsB);

        lengthB = lengthB - nofWinsB;
        if (lengthB == 1) goto CopyA;

        // lengthB == 0 is impossible now if the comparison function is
        // consistent, but we can't assume that it is.
        if (lengthB == 0) goto Succeed;
      }
      workArray.objects[dest--] = workArray.objects[cursorA--];
      if (--lengthA == 0) goto Succeed;
    }
    ++minGallop;
    sortState.minGallop = minGallop;
  }
} label Succeed {
  if (lengthB > 0) {
    dcheck(lengthA == 0);
    Copy(tempArray, 0, workArray, dest - (lengthB - 1), lengthB);
  }
} label CopyA {
  dcheck(lengthB == 1 && lengthA > 0);

  // The first element of run B belongs at the front of the merge.
  dest = dest - lengthA;
  cursorA = cursorA - lengthA;
  Copy(workArray, cursorA + 1, workArray, dest + 1, lengthA);
  workArray.objects[dest] = tempArray.objects[cursorTemp];
}
}

// Compute a good value for the minimum run length; natural runs shorter
// than this are boosted artificially via binary insertion sort.
//
// If n < 64, return n (it's too small to bother with fancy stuff).
// Else if n is an exact power of 2, return 32.
// Else return an int k, 32 <= k <= 64, such that n/k is close to, but
// strictly less than, an exact power of 2.
//
// See listsort.txt for more info.
macro ComputeMinRunLength(nArg: Smi): Smi {
  let n: Smi = nArg;
  let r: Smi = 0;  // Becomes 1 if any 1 bits are shifted off.

  dcheck(n >= 0);
  while (n >= 64) {
    r = r | (n & 1);
    n = n >> 1;
  }

  const minRunLength: Smi = n + r;
  dcheck(nArg < 64 || (32 <= minRunLength && minRunLength <= 64));
  return minRunLength;
}

// Returns true iff run_length(n - 2) > run_length(n - 1) + run_length(n).
macro RunInvariantEstablished(implicit context: Context)(
  pendingRuns: FixedArray, n: Smi): bool {
  if (n < 2) return true;

  const runLengthN: Smi = GetPendingRunLength(pendingRuns, n);
  const runLengthNM: Smi = GetPendingRunLength(pendingRuns, n - 1);
  const runLengthNMM: Smi = GetPendingRunLength(pendingRuns, n - 2);

  return runLengthNMM > runLengthNM + runLengthN;
}

// Examines the stack of runs waiting to be merged, merging adjacent runs
// until the stack invariants are re-established:
//
//   1. run_length(i - 3) > run_length(i - 2) + run_length(i - 1)
//   2. run_length(i - 2) > run_length(i - 1)
//
// TODO(szuend): Remove unnecessary loads. This macro was refactored to
//               improve readability, introducing unnecessary loads in the
//               process. Determine if all these extra loads are ok.
transitioning macro MergeCollapse(
  context: Context, sortState: SortState): void {
    const pendingRuns: FixedArray = sortState.pendingRuns;

    // Reload the stack size because MergeAt might change it.
    while (GetPendingRunsSize(sortState) > 1) {
  let n: Smi = GetPendingRunsSize(sortState) - 2;

  if (!RunInvariantEstablished(pendingRuns, n + 1) ||
    !RunInvariantEstablished(pendingRuns, n)) {
    if (GetPendingRunLength(pendingRuns, n - 1) <
      GetPendingRunLength(pendingRuns, n + 1)) {
      --n;
    }

    MergeAt(n);
  } else if (
    GetPendingRunLength(pendingRuns, n) <=
    GetPendingRunLength(pendingRuns, n + 1)) {
    MergeAt(n);
  } else {
    break;
  }
}
}

// Regardless of invariants, merge all runs on the stack until only one
// remains. This is used at the end of the mergesort.
transitioning macro
MergeForceCollapse(context: Context, sortState: SortState): void {
  const pendingRuns: FixedArray = sortState.pendingRuns;

  // Reload the stack size becuase MergeAt might change it.
  while (GetPendingRunsSize(sortState) > 1) {
  let n: Smi = GetPendingRunsSize(sortState) - 2;

  if (n > 0 &&
    GetPendingRunLength(pendingRuns, n - 1) <
    GetPendingRunLength(pendingRuns, n + 1)) {
    --n;
  }
  MergeAt(n);
}
}

transitioning macro
ArrayTimSortImpl(context: Context, sortState: SortState, length: Smi): void {
  if (length < 2) return;
  let remaining: Smi = length;

  // March over the array once, left to right, finding natural runs,
  // and extending short natural runs to minrun elements.
  let low: Smi = 0;
  const minRunLength: Smi = ComputeMinRunLength(remaining);
  while (remaining != 0) {
  let currentRunLength: Smi = CountAndMakeRun(low, low + remaining);

  // If the run is short, extend it to min(minRunLength, remaining).
  if (currentRunLength < minRunLength) {
    const forcedRunLength: Smi = SmiMin(minRunLength, remaining);
    BinaryInsertionSort(low, low + currentRunLength, low + forcedRunLength);
    currentRunLength = forcedRunLength;
  }

  // Push run onto pending-runs stack, and maybe merge.
  PushRun(sortState, low, currentRunLength);

  MergeCollapse(context, sortState);

  // Advance to find next run.
  low = low + currentRunLength;
  remaining = remaining - currentRunLength;
}

MergeForceCollapse(context, sortState);
dcheck(GetPendingRunsSize(sortState) == 1);
dcheck(GetPendingRunLength(sortState.pendingRuns, 0) == length);
}

transitioning macro
CompactReceiverElementsIntoWorkArray(
  implicit context: Context, sortState: SortState)(): Smi {
  let growableWorkArray = growable_fixed_array:: GrowableFixedArray{
    array: sortState.workArray,
    capacity: Convert<intptr>(sortState.workArray.length),
      length: 0
};

const loadFn = sortState.loadFn;

// TODO(szuend): Implement full range sorting, not only up to MaxSmi.
//               https://crbug.com/v8/7970.
const receiverLength: Number = sortState.initialReceiverLength;
dcheck(IsNumberNormalized(receiverLength));

const sortLength: Smi = TaggedIsSmi(receiverLength) ?
  UnsafeCast<Smi>(receiverLength) :
  Convert<PositiveSmi>(kSmiMax) otherwise unreachable;

// Move all non-undefined elements into {sortState.workArray}, holes
// are ignored.
let numberOfUndefined: Smi = 0;
for (let i: Smi = 0; i < receiverLength; ++i) {
  const element: JSAny | TheHole = loadFn(context, sortState, i);

  if (element == TheHole) {
    // Do nothing for holes. The result is that elements are
    // compacted at the front of the work array.
  } else if (element == Undefined) {
    numberOfUndefined++;
  } else {
    growableWorkArray.Push(element);
  }
}

// Reset the workArray on the frameState, as it may have grown.
sortState.workArray = growableWorkArray.array;
sortState.sortLength = sortLength;
sortState.numberOfUndefined = numberOfUndefined;

return Convert<Smi>(growableWorkArray.length);
}

transitioning macro
CopyWorkArrayToReceiver(implicit context: Context, sortState: SortState)(
  numberOfNonUndefined: Smi): void {
    const storeFn = sortState.storeFn;
    const workArray = sortState.workArray;

    dcheck (numberOfNonUndefined <= workArray.length);
dcheck(
  numberOfNonUndefined + sortState.numberOfUndefined <=
  sortState.sortLength);

// Writing the elements back is a 3 step process:
//   1. Copy the sorted elements from the workarray to the receiver.
//   2. Add {nOfUndefined} undefineds to the receiver.
//   3. Depending on the backing store either delete properties or
//      set them to the TheHole up to {sortState.sortLength}.
let index: Smi = 0;
for (; index < numberOfNonUndefined; ++index) {
  storeFn(
    context, sortState, index, UnsafeCast<JSAny>(workArray.objects[index]));
}

const numberOfUndefinedEnd: Smi =
  sortState.numberOfUndefined + numberOfNonUndefined;
for (; index < numberOfUndefinedEnd; ++index) {
  storeFn(context, sortState, index, Undefined);
}

const end: Smi = sortState.sortLength;
const deleteFn = sortState.deleteFn;
for (; index < end; ++index) {
  deleteFn(context, sortState, index);
}
}

transitioning builtin
ArrayTimSort(context: Context, sortState: SortState): JSAny {
  const numberOfNonUndefined: Smi = CompactReceiverElementsIntoWorkArray();
  ArrayTimSortImpl(context, sortState, numberOfNonUndefined);

  try {
    // The comparison function or toString might have changed the
    // receiver, if that is the case, we switch to the slow path.
    sortState.CheckAccessor() otherwise Slow;
  } label Slow deferred {
    sortState.ResetToGenericAccessor();
  }

  CopyWorkArrayToReceiver(numberOfNonUndefined);
  return kSuccess;
}

// https://tc39.github.io/ecma262/#sec-array.prototype.sort
transitioning javascript builtin
ArrayPrototypeSort(
  js - implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  // 1. If comparefn is not undefined and IsCallable(comparefn) is false,
  //    throw a TypeError exception.
  const comparefnObj: JSAny = arguments[0];
  const comparefn = Cast<(Undefined | Callable)>(comparefnObj) otherwise
  ThrowTypeError(MessageTemplate:: kBadSortComparisonFunction, comparefnObj);

  // 2. Let obj be ? ToObject(this value).
  const obj: JSReceiver = ToObject(context, receiver);

  // 3. Let len be ? ToLength(? Get(obj, "length")).
  const len: Number = GetLengthProperty(obj);

  if (len < 2) return obj;

  const sortState: SortState = NewSortState(obj, comparefn, len);
  ArrayTimSort(context, sortState);

  return obj;
}
}
