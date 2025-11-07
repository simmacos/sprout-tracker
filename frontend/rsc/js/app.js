document.addEventListener("DOMContentLoaded", function () {
  // Elementi esistenti per l'autenticazione
  const loginBtn = document.getElementById("loginBtn");
  const userProfile = document.getElementById("userProfile");
  const userImg = document.getElementById("userImg");
  const userName = document.getElementById("userName");
  const profileDropdown = document.querySelector(".profile-dropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  const addHabitBtn = document.getElementById("addHabitBtn");
  const modal = document.getElementById("addHabitModal");
  const closeModalBtn = document.getElementById("closeModal");
  const cancelHabitBtn = document.getElementById("cancelHabit");
  const saveHabitBtn = document.getElementById("saveHabit");
  const weekDaysButtons = document.querySelectorAll(".day-btn");
  const isHobbyToggle = document.getElementById("isHobby");
  const habitsList = document.getElementById("habitsList");
  const hobbiesList = document.getElementById("hobbiesList");
  const hobbiesSection = document.getElementById("hobbiesSection");
  const introSection = document.getElementById("introSection");
  const mainContent = document.getElementById("mainContent");

  const isMobile = window.innerWidth <= 600;
  const API_BASE_URL = "https://haby.cocchy.casa";
  let habitMap = {}; 
  let togglingHabits = new Set(); 

  // Check login status on page load
  checkLoginStatus();

  // Login button click handler
  loginBtn.addEventListener("click", function () {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  });

  // Toggle dropdown with mobile support
  document
    .querySelector(".profile-trigger")
    ?.addEventListener("click", function (e) {
      e.stopPropagation();
      profileDropdown.classList.toggle("active");
      if (isMobile) {
        document.body.style.overflow = "hidden";
      }
    });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!profileDropdown?.contains(e.target)) {
      profileDropdown?.classList.remove("active");
      if (isMobile) {
        document.body.style.overflow = "";
      }
    }
  });

  // Prevent dropdown from closing when clicking inside
  document
    .querySelector(".dropdown-menu")
    ?.addEventListener("click", function (e) {
      e.stopPropagation();
    });

  // Modal Management
  addHabitBtn?.addEventListener("click", openModal);
  closeModalBtn?.addEventListener("click", closeModal);
  cancelHabitBtn?.addEventListener("click", closeModal);

  // Close modal when clicking outside
  modal?.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  function checkLoginStatus() {
    fetch(`${API_BASE_URL}/api/auth/user`, {
      credentials: "include", // Rimuove gli headers manuali
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        if (data.name) {
          showUserProfile(data);
          introSection.classList.add("hidden"); // Nascondi la schermata introduttiva
          loadHabits(); // Carica i dati
        } else {
          showLoginButton();
          introSection.classList.remove("hidden"); // Mostra la schermata introduttiva
          mainContent.classList.add("hidden"); // Nascondi il
        }
      })
      .catch((err) => {
        console.error("Error checking auth:", err);
        showLoginButton();
        introSection.classList.remove("hidden"); // Mostra la schermata introduttiva in caso di errore
        mainContent.classList.add("hidden"); // Nascondi il contenuto della web app
      });
  }

  function showLoginButton() {
    loginBtn.classList.remove("hidden");
    userProfile.classList.add("hidden");
    introSection.classList.remove("hidden");
    mainContent.classList.add("hidden");
  }

  function showUserProfile(user) {
    loginBtn.classList.add("hidden");
    userProfile.classList.remove("hidden");
    introSection.classList.add("hidden");
    mainContent.classList.remove("hidden");

    if (user.picture) {
      const img = new Image();
      img.onload = function () {
        userImg.src = user.picture;
      };
      img.onerror = function () {
        console.error("Failed to load profile picture");
        userImg.src =
          'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E4E4DE"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
      };
      img.src = user.picture;
    }

    userName.textContent = user.name;
  }

  logoutBtn?.addEventListener("click", function (e) {
    e.preventDefault();

    fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        window.location.href =
          data.redirectUrl || "https://habit.cocchy.casa";
      })
      .catch((error) => {
        console.error("Logout error:", error);
        window.location.href = "https://habit.cocchy.casa";
      });
  });

  // Error handling functions
  function handleResponse(response) {
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    // Return JSON only if response is not empty (e.g., 204 No Content)
    return response.status !== 204 ? response.json() : null;
}
  function handleError(error) {
    console.error("Operation failed:", error);
    if (error.status === 401) {
      handleAuthError(error);
    } else {
      alert("Operation failed. Please try again.");
    }
  }

  function handleAuthError(error) {
    console.error("Authentication error:", error);
    if (error.status === 401) {
      window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
    }
  }

  async function loadHabits() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/habits?includeHobbies=true`, {
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });
        const habits = await handleResponse(response);

        if (!Array.isArray(habits)) {
            console.error("Expected array of habits, received:", habits);
            return;
        }

        // Clear and populate habitMap
        habitMap = {};
        for (const habit of habits) {
            // Fetch streak for each habit
            const streakResponse = await fetch(
                `${API_BASE_URL}/api/habits/${habit.id}/completions/streak`,
                {
                    credentials: "include",
                    headers: {
                        Accept: "application/json",
                    },
                }
            );
            const streakData = await streakResponse.json();
            habit.streak = streakData.streak || 0; // Store streak in habit object

            habitMap[habit.id] = habit; // Cache complete habit data
        }

        // Render all habits and hobbies
        renderHabitSections(habits);
    } catch (error) {
        console.error("Error loading habits:", error);
        habitsList.innerHTML = '<div class="error">Error loading habits</div>';
    }
}

function renderHabitSections(habits) {
    const regularHabits = habits.filter((h) => !h.isHobby);
    const hobbies = habits.filter((h) => h.isHobby);

    // Render regular habits
    habitsList.innerHTML =
        regularHabits.length > 0
            ? regularHabits.map((habit) => createHabitCard(habit)).join("")
            : '<div class="no-habits">No habits added yet</div>';

    // Render hobbies section if needed
    if (hobbies.length > 0) {
        hobbiesSection.style.display = "block";
        hobbiesList.innerHTML = hobbies.map((habit) => createHabitCard(habit)).join("");
    } else {
        hobbiesSection.style.display = "none";
    }

    addHabitCardListeners();
}

function createHabitCard(habit) {
  const isCompletedToday = habit.completions?.some((completion) => {
      const completionDate = completion.id.completionDate;
      const today = new Date().toISOString().split("T")[0];
      return completionDate === today;
  });

  return `
    <div class="habit-card" data-id="${habit.id}">
        <input type="checkbox" class="habit-checkbox" ${
            isCompletedToday ? "checked" : ""
        }>
        <div class="habit-content">
            <div class="habit-info">
                <div class="habit-title">${habit.name}</div>
                <div class="habit-meta">${
                    habit.isHobby
                        ? "Flexible"
                        : getScheduleDisplay(habit.schedule)
                }</div>
            </div>
            <div class="habit-streak">
                <i class="fas fa-fire"></i>
                <span>${habit.streak || 0} days</span>
            </div>
        </div>
    </div>
  `;
}

  function getScheduleDisplay(schedule) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activeDays = schedule
      .split("")
      .map((active, index) => (active === "1" ? days[index] : null))
      .filter((day) => day !== null);

    return activeDays.length === 7 ? "Daily" : activeDays.join(", ");
  }

  // Week days selection
  weekDaysButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      if (isHobbyToggle.checked) return;
      this.classList.toggle("active");
    });
  });

  // Hobby toggle handling
  isHobbyToggle?.addEventListener("change", function () {
    if (this.checked) {
      weekDaysButtons.forEach((btn) => {
        btn.classList.add("active");
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
      });
    } else {
      weekDaysButtons.forEach((btn) => {
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
      });
    }
  });

  function openModal() {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    resetModalForm();

    // Select all days by default when opening the modal
    weekDaysButtons.forEach((btn) => {
      btn.classList.add("active");
    });
  }

  function closeModal() {
    modal.classList.remove("active");
    document.body.style.overflow = "";
    resetModalForm();
  }



  function resetModalForm() {
    document.getElementById("habitName").value = "";
    document.getElementById("habitDesc").value = "";
    isHobbyToggle.checked = false;
    weekDaysButtons.forEach((btn) => {
      btn.classList.add("active"); // Select all days by default
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    });
  }

  function getScheduleFromButtons() {
    return Array.from(weekDaysButtons)
      .slice(0, 7) // Prende solo i primi 7 giorni
      .map((btn) => (btn.classList.contains("active") ? "1" : "0"))
      .join("");
  }

  // Save habit
  saveHabitBtn?.addEventListener("click", saveHabit);

  function saveHabit() {
    const name = document.getElementById("habitName").value.trim();
    const description = document.getElementById("habitDesc").value.trim();
    const isHobby = isHobbyToggle.checked;
    const schedule = isHobby ? "1111111" : getScheduleFromButtons();

    const saveButton = document.getElementById("saveHabit"); // Reference to the button

    // Validation for the input fields
    if (!name) {
        alert("Please enter a habit name.");
        return;
    }
    if (!isHobby && !schedule.includes("1")) {
        alert("Please select at least one day.");
        return;
    }

    // Disable the button to prevent double-clicking
    saveButton.disabled = true;

    const habitData = {
        name: name,
        description: description,
        isHobby: isHobby,
        schedule: schedule,
    };

    fetch(`${API_BASE_URL}/api/habits`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(habitData),
    })
        .then(handleResponse)
        .then((habit) => {
            console.log("Habit saved:", habit);
            closeModal(); // Close the modal after successfully creating the habit
            loadHabits(); // Reload the habit list to reflect the new addition
        })
        .catch((error) => {
            console.error("Error saving habit:", error);
            alert("Failed to create habit. Please try again.");
        })
        .finally(() => {
            // Re-enable the button after the request completes (success or failure)
            saveButton.disabled = false;
        });
}

  function addHabitCardListeners() {
    document.querySelectorAll(".habit-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const habitId = this.closest(".habit-card").dataset.id;
        toggleHabitCompletion(habitId);
        playSound();
      });
    });

    document.querySelectorAll(".habit-card").forEach((card) => {
      card.addEventListener("click", function (e) {
        if (!e.target.classList.contains("habit-checkbox")) {
          const habitId = this.dataset.id;
          showHabitDetails(habitId);
        }
      });
    });
  }

  function playSound() {
    const audio = new Audio("rsc/js/pop.mp3"); // Percorso aggiornato
    audio.play().catch(e => console.log("Errore nel riprodurre l'audio:", e)); // Gestisce eventuali errori (es. utente non ha interagito ancora)
  }

  async function toggleHabitCompletion(habitId) {
    if (togglingHabits.has(habitId)) return; // Avoid overlapping requests
    togglingHabits.add(habitId); // Mark habit as being toggled

    const today = new Date().toISOString().split("T")[0];

    try {
        // Send toggle request to the backend to mark/unmark today as completed
        const response = await fetch(
            `${API_BASE_URL}/api/habits/${habitId}/completions/toggle?date=${today}`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to toggle habit completion (status: ${response.status})`);
        }

        // Fetch updated streak from the backend
        const streakResponse = await fetch(
            `${API_BASE_URL}/api/habits/${habitId}/completions/streak`,
            {
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
            }
        );

        const streakData = await streakResponse.json();
        const updatedStreak = streakData.streak || 0;

        // Update local habit data in habitMap with the new streak value
        const habit = habitMap[habitId];
        if (habit) {
            const isCompleted = habit.completions?.some(
                (c) => c.id.completionDate === today
            );

            // Toggle today's completion
            if (!isCompleted) {
                habit.completions.push({ id: { completionDate: today } });
            } else {
                habit.completions = habit.completions.filter(
                    (c) => c.id.completionDate !== today
                );
            }

            habit.streak = updatedStreak; // Use backend-calculated streak
            habitMap[habitId] = habit; // Update the habit in the cache

            // Re-render the updated habit card
            const card = document.querySelector(`.habit-card[data-id="${habitId}"]`);
            if (card) {
                card.outerHTML = createHabitCard(habit); // Replace card with updated one
            }

            // Re-add listeners for the updated card
            addHabitCardListeners();
        }
    } catch (error) {
        console.error("Error toggling habit completion:", error);
        alert("Unable to toggle habit. Please try again.");
    } finally {
        togglingHabits.delete(habitId); // Remove the habit from the toggle state
    }
}

  function showHabitDetails(habitId) {
    const modal = document.getElementById("habitDetailsModal");
    const viewMode = document.getElementById("viewMode");
    const editMode = document.getElementById("editMode");
    const editBtn = document.getElementById("editHabitBtn");
    const saveEditBtn = document.getElementById("saveEditBtn");

    // Retrieve habit from preloaded habitMap
    const habit = habitMap[habitId];

    if (!habit) {
        console.error("Habit not found in habitMap:", habitId);
        alert("Unable to fetch habit details.");
        return;
    }

    // Populate modal with habit details
    document.getElementById("habitDetailTitle").textContent = habit.name;
    const descriptionHtml = marked.parse(habit.description || "");
    document.getElementById("habitDescription").innerHTML = descriptionHtml;

    // Show the modal
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    modal.addEventListener("click", function (e) {
        if (e.target === modal) {
            closeDetailsModal();
        }
    });

    // Edit functionality
    editBtn.onclick = () => {
        viewMode.classList.add("hidden");
        editMode.classList.remove("hidden");
        editBtn.classList.add("hidden");
        saveEditBtn.classList.remove("hidden");

        document.getElementById("editDescription").value = habit.description;

        // Update week days selection based on schedule
        const weekDays = document.querySelectorAll("#editWeekDays .day-btn");
        habit.schedule.split("").forEach((active, index) => {
            weekDays[index].classList.toggle("active", active === "1");
        });
    };

    // Save edited habit
    saveEditBtn.onclick = () => {
        const updatedSchedule = Array.from(
            document.querySelectorAll("#editWeekDays .day-btn")
        )
            .map((btn) => (btn.classList.contains("active") ? "1" : "0"))
            .join("");

        const updatedDescription =
            document.getElementById("editDescription").value;

        fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                ...habit,
                schedule: updatedSchedule,
                description: updatedDescription,
            }),
        })
            .then(handleResponse)
            .then(() => {
                loadHabits();
                closeDetailsModal();
            })
            .catch(handleError);
    };

    document.getElementById("closeDetailsModal").onclick = closeDetailsModal;

    document.getElementById("deleteHabitBtn").onclick = () => {
        if (confirm("Are you sure you want to delete this habit?")) {
            fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
            })
                .then((response) => {
                    if (response.ok) {
                        console.log("Habit successfully deleted");
                        loadHabits();
                        closeDetailsModal();
                    } else {
                        throw new Error(
                            `Failed to delete habit. Server returned status: ${response.status}`
                        );
                    }
                })
                .catch((error) => {
                    console.error("Error deleting habit:", error);
                    alert("There was an error deleting the habit. Please try again.");
                });
        }
    };

    function closeDetailsModal() {
        modal.classList.remove("active");
        document.body.style.overflow = "";
        viewMode.classList.remove("hidden");
        editMode.classList.add("hidden");
        editBtn.classList.remove("hidden");
        saveEditBtn.classList.add("hidden");
    }
  }

  // Add mobile close button
  if (isMobile) {
    const closeBtn = document.createElement("button");
    closeBtn.className = "dropdown-item";
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
    closeBtn.addEventListener("click", function () {
      profileDropdown.classList.remove("active");
      document.body.style.overflow = "";
    });
    document.querySelector(".dropdown-menu")?.prepend(closeBtn);
  }
});
