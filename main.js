 (function () {
  var hd = document.getElementById('hd');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header and homepage booking button
  var cta = document.getElementById('cta');

  function placeCta() {
    if (!cta) return;

    var max = document.documentElement.scrollHeight - innerHeight;
    var p = Math.min(1, scrollY / Math.max(1, Math.min(innerHeight * .9, max)));
    p = p * p * (3 - 2 * p);

    cta.style.paddingLeft = cta.style.paddingRight = (26 + p * 16) + 'px';
    cta.style.left = (20 + p * ((innerWidth - cta.offsetWidth) / 2 - 20)) + 'px';
  }

  function onScroll() {
    if (hd) hd.classList.toggle('min', scrollY > 40);
    placeCta();
  }

  addEventListener('resize', onScroll);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Fade sections into view
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('on');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });

    document.querySelectorAll('.rv').forEach(function (el) {
      io.observe(el);
    });
  } else {
    document.querySelectorAll('.rv').forEach(function (el) {
      el.classList.add('on');
    });
  }

  // Homepage slideshow
  var hero = document.getElementById('hero');

  if (hero) {
    var slides = Array.from(hero.querySelectorAll('.slide'));
    var dotsBox = document.getElementById('dots');
    var index = 0;
    var timer;

    if (dotsBox && slides.length) {
      var dots = slides.map(function (_, k) {
        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Show image ' + (k + 1));
        button.addEventListener('click', function () {
          go(k);
          restart();
        });
        dotsBox.appendChild(button);
        return button;
      });

      function go(n) {
        index = (n + slides.length) % slides.length;

        slides.forEach(function (slide, k) {
          slide.classList.toggle('on', k === index);
          dots[k].classList.toggle('on', k === index);
        });
      }

      function restart() {
        clearInterval(timer);
        if (!reduce) {
          timer = setInterval(function () {
            go(index + 1);
          }, 6500);
        }
      }

      var prev = document.getElementById('hprev');
      var next = document.getElementById('hnext');

      if (prev) prev.addEventListener('click', function () {
        go(index - 1);
        restart();
      });

      if (next) next.addEventListener('click', function () {
        go(index + 1);
        restart();
      });

      hero.addEventListener('mouseenter', function () {
        clearInterval(timer);
      });

      hero.addEventListener('mouseleave', restart);

      go(0);
      restart();
    }
  }

  // Gallery tilt effect
  if (window.matchMedia('(hover: hover)').matches && !reduce) {
    document.querySelectorAll('.g').forEach(function (tile) {
      tile.addEventListener('mousemove', function (event) {
        var rect = tile.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - .5;
        var y = (event.clientY - rect.top) / rect.height - .5;

        tile.style.transform =
          'perspective(800px) rotateY(' + (x * 8) +
          'deg) rotateX(' + (-y * 8) + 'deg)';
      });

      tile.addEventListener('mouseleave', function () {
        tile.style.transform = '';
      });
    });
  }

  // Booking calendar
  var daysBox = document.getElementById('days');

  if (!daysBox) return;

  var monthLabel = document.getElementById('month');
  var prevMonth = document.getElementById('prev');
  var nextMonth = document.getElementById('next');
  var summary = document.getElementById('sum');
  var slotsBox = document.getElementById('slots');
  var chase = document.getElementById('chase');
  var dialog = document.getElementById('dlg');
  var form = document.getElementById('form');
  var when = document.getElementById('when');
  var nameInput = document.getElementById('fName');
  var phoneInput = document.getElementById('fPhone');
  var serviceInput = document.getElementById('fService');
  var cancelButton = document.getElementById('cancel');
  var toast = document.getElementById('toast');

  // Demo bookings are saved in this browser only.
  // A backend is required to share bookings across devices.
  var STORAGE_KEY = 'urbanCutsDemoBookings';

  function readBookings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveBookings(bookings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
      return true;
    } catch (error) {
      showToast('Could not save this booking in your browser.');
      return false;
    }
  }

  var bookings = readBookings();
  var now = new Date();
  var displayedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  var selectedDate = '';
  var selectedTime = '';

  function dateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function parseDate(key) {
    var parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function prettyDate(key) {
    return parseDate(key).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  // Hourly appointments from 10 AM through 11 PM.
  function getTimes() {
    var result = [];

    for (var hour = 10; hour <= 23; hour++) {
      var h = hour % 12 || 12;
      var suffix = hour < 12 ? 'AM' : 'PM';
      result.push({
        value: String(hour).padStart(2, '0') + ':00',
        label: h + ':00 ' + suffix
      });
    }

    return result;
  }

  var times = getTimes();

  function isPastDate(key) {
    return parseDate(key) < new Date(
      now.getFullYear(), now.getMonth(), now.getDate()
    );
  }

  function isPastTime(key, time) {
    if (key !== dateKey(new Date())) return false;

    var parts = time.split(':').map(Number);
    var appointment = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(),
      parts[0], parts[1]
    );

    return appointment <= new Date();
  }

  function bookedCount(key) {
    var entries = bookings[key] || {};
    return Object.keys(entries).filter(function (time) {
      return !isPastTime(key, time);
    }).length;
  }

  function isBooked(key, time) {
    return !!(bookings[key] && bookings[key][time]);
  }

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove('show');
    }, 3000);
  }

  function renderCalendar() {
    var year = displayedMonth.getFullYear();
    var month = displayedMonth.getMonth();

    monthLabel.textContent = displayedMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    prevMonth.disabled =
      year === now.getFullYear() && month === now.getMonth();

    nextMonth.disabled = false;
    daysBox.innerHTML = '';

    // Monday-first calendar
    var firstDay = new Date(year, month, 1);
    var offset = (firstDay.getDay() + 6) % 7;
    var numberOfDays = new Date(year, month + 1, 0).getDate();

    for (var i = 0; i < offset; i++) {
      var blank = document.createElement('span');
      blank.setAttribute('aria-hidden', 'true');
      daysBox.appendChild(blank);
    }

    for (var day = 1; day <= numberOfDays; day++) {
      var date = new Date(year, month, day);
      var key = dateKey(date);
      var past = isPastDate(key);
      var full = bookedCount(key) >= times.length;
      var button = document.createElement('button');

      button.type = 'button';
      button.className = 'day';
      button.textContent = day;

      if (sameDay(date, now)) button.classList.add('today');
      if (key === selectedDate) button.classList.add('sel');
      if (past) button.classList.add('past');
      if (full) button.classList.add('full');

      var small = document.createElement('small');
      small.textContent = past ? '' : (full ? 'Full' : 'Open');
      button.appendChild(small);

      button.disabled = past || full;
      button.setAttribute('aria-label',
        prettyDate(key) + (full ? ', fully booked' : ''));

      button.addEventListener('click', function (dateKeyValue) {
        return function () {
          selectedDate = dateKeyValue;
          selectedTime = '';
          renderCalendar();
          renderSlots();
        };
      }(key));

      daysBox.appendChild(button);
    }
  }

  function renderSlots() {
    slotsBox.innerHTML = '';
    selectedTime = selectedTime && !isBooked(selectedDate, selectedTime)
      && !isPastTime(selectedDate, selectedTime) ? selectedTime : '';

    if (!selectedDate) {
      summary.textContent = 'Choose a day';
      slotsBox.innerHTML =
        '<p class="hint">Open and booked times for the day you pick will show here.</p>';
      if (chase) chase.classList.remove('ready');
      return;
    }

    summary.textContent = prettyDate(selectedDate);

    if (isPastDate(selectedDate)) {
      slotsBox.innerHTML = '<p class="hint">Please choose a future date.</p>';
      return;
    }

    var list = document.createElement('div');
    list.className = 'slots';

    times.forEach(function (time) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot';
      button.textContent = time.label;

      var unavailable = isBooked(selectedDate, time.value) ||
        isPastTime(selectedDate, time.value);

      if (unavailable) {
        button.disabled = true;
        button.setAttribute('aria-label', time.label + ', unavailable');
      }

      if (selectedTime === time.value) button.classList.add('sel');

      button.addEventListener('click', function () {
        selectedTime = time.value;
        renderSlots();

        if (chase) chase.classList.add('ready');
      });

      list.appendChild(button);
    });

    slotsBox.appendChild(list);

    if (chase) {
      chase.classList.toggle('ready', !!selectedTime);
    }
  }

  prevMonth.addEventListener('click', function () {
    if (prevMonth.disabled) return;

    displayedMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() - 1,
      1
    );

    renderCalendar();
  });

  nextMonth.addEventListener('click', function () {
    displayedMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() + 1,
      1
    );

    renderCalendar();
  });

  function openBookingForm() {
    if (!selectedDate) {
      showToast('Please choose a day first.');
      return;
    }

    if (!selectedTime) {
      showToast('Please choose an available time.');
      return;
    }

    // Recheck availability before opening the form.
    bookings = readBookings();

    if (isBooked(selectedDate, selectedTime) ||
        isPastDate(selectedDate) ||
        isPastTime(selectedDate, selectedTime)) {
      showToast('That time is no longer available. Please choose another.');
      renderCalendar();
      renderSlots();
      return;
    }

    when.textContent = prettyDate(selectedDate) + ' at ' +
      times.find(function (time) {
        return time.value === selectedTime;
      }).label;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      showToast('Please use an up-to-date browser to book.');
    }
  }

  if (chase) {
    chase.addEventListener('click', openBookingForm);
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', function () {
      dialog.close();
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.reportValidity()) return;

    bookings = readBookings();

    if (!selectedDate || !selectedTime ||
        isBooked(selectedDate, selectedTime) ||
        isPastDate(selectedDate) ||
        isPastTime(selectedDate, selectedTime)) {
      dialog.close();
      showToast('That time is unavailable. Please choose another.');
      renderCalendar();
      renderSlots();
      return;
    }

    var booking = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      service: serviceInput.value,
      date: selectedDate,
      time: selectedTime,
      createdAt: new Date().toISOString()
    };

    if (!booking.name || !booking.phone) {
      showToast('Please enter your name and phone number.');
      return;
    }

    if (!bookings[selectedDate]) bookings[selectedDate] = {};
    bookings[selectedDate][selectedTime] = booking;

    if (!saveBookings(bookings)) {
      delete bookings[selectedDate][selectedTime];
      return;
    }

    dialog.close();
    form.reset();
    selectedTime = '';

    renderCalendar();
    renderSlots();

    showToast('Booking saved in this browser. It has not been sent to the salon.');
  });

  // Keep the floating booking button usable on touchscreens.
  if (chase && window.matchMedia('(hover: none)').matches) {
    chase.style.left = 'auto';
    chase.style.top = 'auto';
    chase.style.right = '18px';
    chase.style.bottom = '18px';
    chase.style.margin = '0';
  }

  renderCalendar();
  renderSlots();
})();
