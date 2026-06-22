# Operating Systems Notes: Unit 2 CPU Scheduling

## 1. Introduction to CPU Scheduling
CPU Scheduling is the process of deciding which process in the ready queue is allocated the CPU. Its goal is to make the system efficient, fast, and fair.

### Key Metrics:
- **CPU Utilization**: Keep the CPU as busy as possible (0% to 100%).
- **Throughput**: Number of processes completed per unit time.
- **Turnaround Time**: Time interval from submission of a process to its completion.
- **Waiting Time**: Sum of periods spent waiting in the ready queue.
- **Response Time**: Time from submission until the first response is produced.

## 2. Scheduling Algorithms
1. **First-Come, First-Served (FCFS)**:
   - Non-preemptive.
   - Simplest scheduling algorithm.
   - Suffers from the **Convoy Effect**: small processes wait behind a long process, increasing average waiting time.
2. **Shortest Job First (SJF)**:
   - Associates each process with its next CPU burst length.
   - Gives the minimum average waiting time.
   - Can be preemptive (Shortest Remaining Time First - SRTF) or non-preemptive.
3. **Round Robin (RR)**:
   - Designed for time-sharing systems.
   - Each process gets a small unit of CPU time called a **time quantum** (typically 10-100ms).
   - Preemptive. Performance depends heavily on the size of the time quantum.
