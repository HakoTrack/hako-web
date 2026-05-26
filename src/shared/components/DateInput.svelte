<script>
  import { onMount, onDestroy } from "svelte";

  let { value = $bindable(), label = "" } = $props();
  let isCalendarOpen = $state(false);
  let containerRef = $state(null);

  function createLocalDate(dateStr) {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // Initial date for calendar display
  let currentDisplayDate = $state(value ? createLocalDate(value) : new Date());

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
  }

  function getCalendarDays(year, month) {
    const numDays = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Add leading empty days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }

  function handleDayClick(day) {
    if (day) {
      // Create YYYY-MM-DD string from local date
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, "0");
      const date = String(day.getDate()).padStart(2, "0");
      value = `${year}-${month}-${date}`;
      isCalendarOpen = false;
    }
  }

  function nextMonth() {
    currentDisplayDate = new Date(
      currentDisplayDate.getFullYear(),
      currentDisplayDate.getMonth() + 1,
      1,
    );
  }

  function prevMonth() {
    currentDisplayDate = new Date(
      currentDisplayDate.getFullYear(),
      currentDisplayDate.getMonth() - 1,
      1,
    );
  }

  function toggleCalendar(e) {
    e.stopPropagation();
    isCalendarOpen = !isCalendarOpen;
    if (isCalendarOpen && !value) {
      currentDisplayDate = new Date(); // If no date, default to today
    } else if (isCalendarOpen && value) {
      currentDisplayDate = createLocalDate(value); // Set calendar to current value
    }
  }

  function handleClickOutside(event) {
    if (
      isCalendarOpen &&
      containerRef &&
      !containerRef.contains(event.target)
    ) {
      isCalendarOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener("click", handleClickOutside, true);
  });

  onDestroy(() => {
    window.removeEventListener("click", handleClickOutside, true);
  });

  let currentYear = $derived(currentDisplayDate.getFullYear());
  let currentMonth = $derived(currentDisplayDate.getMonth());
  let calendarDays = $derived(getCalendarDays(currentYear, currentMonth));

  let formattedValue = $derived(
    value
      ? createLocalDate(value).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "",
  );
</script>

<div bind:this={containerRef} class="relative w-full">
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label
    class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block"
  >
    {label}
  </label>
  <button
    type="button"
    onclick={toggleCalendar}
    class="w-full h-10 flex items-center justify-between bg-(--surface-dim) {value
      ? 'text-(--hako-fg)'
      : 'text-(--c8)'} text-sm rounded-xl border border-(--c8) p-2.5 focus:border-(--hako-accent) outline-none transition-colors"
  >
    <span>{formattedValue || "Select Date"}</span>
    <i class="fa-solid fa-calendar-days text-xs text-(--c8)"></i>
  </button>

  {#if isCalendarOpen}
    <div
      class="absolute z-20 mt-2 bg-(--surface) border border-(--c8) rounded-xl shadow-2xl p-4 w-64"
    >
      <div class="flex justify-between items-center mb-4">
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button
          onclick={prevMonth}
          class="text-(--hako-fg) hover:text-(--hako-accent)"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="font-bold text-(--hako-fg)">
          {months[currentMonth]}
          {currentYear}
        </div>
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button
          onclick={nextMonth}
          class="text-(--hako-fg) hover:text-(--hako-accent)"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center text-xs">
        {#each weekdays as day}
          <div class="text-(--c8) font-bold">{day}</div>
        {/each}
        {#each calendarDays as day}
          <button
            class="p-1 rounded-full {day &&
            day.toISOString().split('T')[0] === value
              ? 'bg-(--hako-accent) text-(--hako-bg)'
              : 'text-(--hako-fg) hover:bg-(--surface-elevated)'}"
            onclick={() => handleDayClick(day)}
            disabled={!day}
          >
            {day ? day.getDate() : ""}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  input::-webkit-calendar-picker-indicator {
    filter: invert(0.8) brightness(1.2);
    cursor: pointer;
  }
</style>
