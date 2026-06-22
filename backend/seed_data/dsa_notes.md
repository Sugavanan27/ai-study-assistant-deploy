# Data Structures & Algorithms Revision Notes

## 1. Time & Space Complexity
- **Big O Notation (O)**: Worst-case upper bound of execution time.
- **Omega Notation (Ω)**: Best-case lower bound.
- **Theta Notation (Θ)**: Tight bound for average runtime.

### Complexity Classes:
- O(1) - Constant (Hash map search)
- O(log N) - Logarithmic (Binary Search)
- O(N) - Linear (Single iteration)
- O(N log N) - Linearithmic (Merge Sort)
- O(N²) - Quadratic (Bubble Sort)

## 2. Linked Lists
A linear collection of data elements where order is not given by physical memory placement.
- **Singly Linked List**: Elements point to the next element.
- **Doubly Linked List**: Elements point to both next and previous elements.
- **Skip List**: Probability-based multi-layered linked list supporting O(log N) searches.

## 3. Stacks & Queues
- **Stack**: Last-In-First-Out (LIFO). Standard functions: `push`, `pop`, `peek`.
- **Queue**: First-In-First-Out (FIFO). Standard functions: `enqueue`, `dequeue`.

## 4. Sorting Algorithms
- **Merge Sort**: Stable sort using divide-and-conquer. Worst case: O(N log N).
- **Quick Sort**: Unstable sort partitioning around a pivot. Average case: O(N log N).
