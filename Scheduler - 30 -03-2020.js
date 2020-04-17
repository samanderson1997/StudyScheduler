/**
  Changes since last Git upload:
 - Completed work on a reminder setter for exams and deadlines. Extended the system to accept types A and E as per my
 initial plan, and now this sets an all-day calendar entry pertaining to the deadline / exam

 - Started work on a collision system but probably will remove it as it may not be necessary to achieve the scheduler
 objectives.
 */

/**********************************************************************************************************************/
/*********************************************** PROCEDURAL CALLS *****************************************************/
/**********************************************************************************************************************/

// Initialise the calendar
var currentDate = "09-23-2019"; // = new Date(); will set to current date
var cd = new Date(currentDate); // TODO: Update to the real current date when system is done
//var currentDate = stringBuilder(cd); // TODO: Replaces occurrences of currentDate with this when the system is using the real date and not a dummy one

scheduler.config.first_hour = 8;
scheduler.config.last_hour = 24;
scheduler.config.collision_limit = 1;
scheduler.init('scheduler_here', new Date(currentDate), "week"); // Starts at the start of term

const ms_day = (24*(60*60*1000)); // Use to add a day
var evt_count = 0;

// Set up the scheduler and on-screen content
configureSetup(); // Checks for GET request with schedule instructions

/**********************************************************************************************************************/
/********************************************** SETUP FUNCTIONALITY ***************************************************/
/**********************************************************************************************************************/
// First thing to be called, works out the state the of the user's engagement with the UI
function configureSetup() {
  // Actual thing - needs to be made a carbon copy of the database
  var _assignments = [];

  _assignments = populateAssignmentsArray(); // First operation; create and return a carbon copy of the user's modules db table
  // TODO: Add checks for if no modules found

  const url = new URL(window.location.href);
  var query = checkGetRequest(url);
  var sch_plan = {};

  // TODO: This won't work unless you fill it with something
  if(query) { // They were sent here by the Schedule.html page
    sch_plan = generateSchedulePlan(url);
    //_assignments = populateAssignmentsArray(); // Run checks to make sure that DB entries exist
    //work_planner(test_assignments, sch_plan); // TODO: Switch to the following: work_planner(_assignments, sch_plan);

  } else { // They were not sent here from the scheduler page. They are either logging in or first time here
      var success = loadCalendar();
      if(success === false) { // It's their first time here
        testScheduler(); // TODO: This is just a test
        //alert("No saved schedule found. Would you like to create one now?");
      }
  }
}

// Check to see if parameters exist in the URL
function checkGetRequest(url) {
  let urlx = url.toString();
  return urlx.indexOf("&") > -1;
}

// Test function
function testScheduler() {
  var test_assignments = [module1 = {
    moduleCode: "CI346",
    moduleName: "Computer Graphics",
    quota: 100,
    color: "Black",
    dueDate: "2019-12-12"
  }, module2 = {
    moduleCode: "CI360",
    moduleName: "Mobile App Development",
    quota: 200,
    color: "Green",
    dueDate: "2020-05-01"
  }, module3 = {
    moduleCode: "CI301",
    moduleName: "Individual Project",
    quota: 400,
    color: "Blue",
    dueDate: "2020-05-20"
  }, module4 = {
    moduleCode: "CI332",
    moduleName: "Software Validation",
    quota: 200,
    color: "Red",
    dueDate: "2020-04-20"
  }
  ];
  var scheduledPlan = {
    mode:2, // Balanced mode
    startTime: "08:00",
    endTime: "17:00",
    weekends: "off" // If true then will use wknds, if false then ignores Saturday and Sunday
  };

  var extendedAssignments = [m1={
    moduleCode: "CI301",
    moduleName: "The Individual Project",
    quota: 400,
    color: "Black",
    type: "A",
    dueDate: "2020-05-20" },

    m2={ moduleCode: "CI360",
    moduleName: "Mobile App Development",
    quota: 200,
    color: "Green",
      type: "A",
    dueDate: "2020-03-01"},

    m3={ moduleCode: "CI315",
    moduleName: "Design Patterns",
    quota: 100,
      color: "Orange",
      type: "E", // Type: Exam
      dueDate: "2020-01-28"},

    m4={ moduleCode: "CI315",
      moduleName: "Software Architecture",
      quota: 100,
      color: "Brown",
      type: "E",
      dueDate: "2020-06-01" },

    m5={ moduleCode: "CI312",
      moduleName: "Computer Graphics Algorithms",
      quota: 100,
      color: "Purple",
      type: "A",
      dueDate: "2019-12-12"
    },

    m6={ moduleCode: "CI316",
    moduleName: "Software Validation",
    quota: 100,
      color: "Blue",
      type: "A",
      dueDate: "2020-05-31"
    }
    ]; // A large block of stuff to plan to test the refactorStudy assignment();

  //work_planner(test_assignments, scheduledPlan); // For testing normal scheduling

  work_planner(extendedAssignments, scheduledPlan); // For testing refactored scheduling
}

/**********************************************************************************************************************/
/********************************************** ON-SCREEN CONTENT *****************************************************/
/**********************************************************************************************************************/

// Populate sidebar filters- takes unaltered assignments as a param meaning it needs to be called in the proper sequence in order to work properly
function populateFilters(assignments) {
  var subjects = []; // Needed to correspond to events

  // Get the names of each module for display labels
  assignments.forEach(function(assignment) {
    let subject = assignment.moduleName.substring(0, 24) + "...";
    subjects.push(subject);
  });

  // Populate the boxes
  for(let i=0; i<assignments.length; i++) {
    let temp_ID = assignments[i].moduleCode + assignments[i].moduleName.substring(0,1); // Create a temporary unique identifier
    let tempColor = assignments[i].color;

    // Create the checkbox
    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "cb_"+temp_ID;
    checkbox.value = temp_ID;
    checkbox.id = temp_ID;
    checkbox.checked = true;

    // Add the associated listener to each box
    checkbox.addEventListener("change", function() {
      if(checkbox.checked) {
        showStudySessionGroup(checkbox.value, 1, assignments);
        checkbox.checked = true;
      } else {
        showStudySessionGroup(checkbox.value, -1, assignments);
        checkbox.checked = false;
      }
    });

    // Create the label
    var label = document.createElement("label");
    label.htmlFor = temp_ID;
    label.appendChild(document.createTextNode(subjects[i]));
    label.classList.add("modLbl");

    var comb = document.createElement("div");
    comb.className = "filter_item";
    comb.appendChild(checkbox);
    comb.appendChild(label);

    // Get the calendar filters
    var calendarFilters = document.getElementById("calendar_filters");
    calendarFilters.appendChild(comb);
  }
}

// Get the next deadline and make a countdown to it in the bottom corner
function populateCountdown(assignments) {

  // If there are no assignments saved
  if(assignments !== []) {
    assignments = sortByDeadline(assignments, -1); // Sort by soonest
    var added = 0; // Used for keeping track

    // Iterating three times to get the three soonest deadlines
    for(let i=0; i<assignments.length; i++) {
      let dueDate = new Date(assignments[i].dueDate);
      let daysUntil = Math.round(getDaysUntilDeadline(assignments[i].dueDate, cd));

      // If the due date in ms is greater than today's date in ms
      if(dueDate.getTime() > cd.getTime()) {
        let obj = { // Use an object for jQuery convenience
          title: assignments[i].moduleName,
          timeLeft: daysUntil
        };
        $("#countdown_section").append('<h6 class="pb_text">' + obj.title + '</h6><div class="countdown_box"><h5 class="cd_text">' + obj.timeLeft + ' days remaining</h5></div>');
        added++;
        if(added >= 3) { break; }
      }
    }

    // No countdowns were added
    if(added === 0) { $("#countdown_section").append('<h6 class="pb_text">No upcoming deadlines</h6>') }

  } else { // Assignments is empty
    $("#countdown_section").append('<h6 class="pb_text">No modules found</h6>');
  }

}

// Populate the footer with the event notes from the event clicked.
function populateEventNotes() {
  // jQuery event listener for when an event is clicked.
  $('.dhx_cal_event').on('click', function() {
    scheduler.attachEvent("onClick", function(id,ev){
      let event = scheduler.getEvent(id);
      // On click of an event e
      function populateFooter(e) {
        let eventNotes = document.getElementById("event_notes");
        let date = e.created;
        $(eventNotes).text(e.notes);
        $(eventNotes).append('<br>Created on ' + date + '</br>');
      }
      populateFooter(event);
    });
  });
}

/**********************************************************************************************************************/
/********************************************* MAJOR FUNCTIONALITY ****************************************************/
/**********************************************************************************************************************/

/* ASSEMBLY OF SCHEDULER PARTS *****************************************************/
// Main functionality for scheduling with a given plan and list of assignments
function work_planner(assignments, scheduledPlan) {

  // Create a carbon copy for mutating for sidebar content
  var cbc = [];
  assignments.forEach(function(e) {
    let cci = Object.assign({}, e);
    cbc.push(cci);
  });

  // Populate the on-screen content for the sidebar
  populateCountdown(cbc);

  // Get the daily work slot, should be 6 or 8 hrs.
  var cap = getHourDifference(scheduledPlan.startTime, scheduledPlan.endTime, currentDate);
  // Work out the daily average for each module
  var avgs = [];
  for(var i=0; i<assignments.length; i++) {
    var av = getDailyAverage(assignments[i], scheduledPlan.weekends);
    avgs.push(av); // For testing the daily total
  }
  var total = sumArrayValues(avgs); // Add up all the averages

  // Attach the daily averages to each subject
  for(let i=0; i<assignments.length; i++) {
    assignments[i].avg = avgs[i];
    // TEST FOR KEEPING TRACK OF PLANNED HOURS: assignments[i].hoursPlanned = 0;
  }

  // Determine scheduling method
  if(total < cap) { // < 8 or 6- good!
    scheduleByAvgs(assignments, scheduledPlan, cap, total);
  } else { // Long
    refactorStudy(assignments, scheduledPlan, cap, total);
  }

  // With the schedule set, populate the filters
  populateFilters(cbc);
  populateEventNotes();
}

/* GETTING USER INPUT **************************************************************/
// Get the plan of the schedule from the GET request contained in the URL
function generateSchedulePlan(url) {
  var plan = {};
  plan.startTime = url.searchParams.get("startTime");
  plan.endTime = url.searchParams.get("endTime");
  plan.weekends = url.searchParams.get("weekends");
  plan.mode = url.searchParams.get("balance");
  return plan;
}

/* SCHEDULING BY WORKLOAD **********************************************************/
// TODO: Extend to account for mode selection
// If all the daily averages are less than the cap then good, this is easy.
function scheduleByAvgs(assignments, scheduleDetails, cap, total) {
  const method_ID = 1;
  var date = new Date(currentDate + " " + scheduleDetails.startTime);
  var quotasComplete = false;

  // While there's still work to be done
  while (quotasComplete === false) {
    let dst = scheduleBatchSubjects(date, assignments, cap, total, scheduleDetails, method_ID); // Decrements quotas internally

    // Fix issues with daylight savings offset
    let nextDay = new Date(dst.getTime() + ms_day); // The finish time + the ms equivalent of a day
    let rDate = resetDate(nextDay); // Reset that day to remove the timestamp
    date = new Date(rDate + " " + scheduleDetails.startTime); // Update the current date to the new date + the plan's daily start time

    // Check to see if there's work to be done and reshuffle the array for variety
    quotasComplete = checkAllQuotas(assignments);
    assignments = randomise(assignments); // Randomise the array
  }
  //alert(assignments[0].quota);
  alert("Scheduling complete.");
}

// If daily averages exceed the daily cap, then ah whatever we'll come back to this.
function refactorStudy(assignments, plan, cap, total) {
  const method_ID = 2;
  var date = new Date(currentDate + " " + plan.startTime); // Create a rolling date

  // Feasibility checks
  let feasible = determineOverallFeasibility(assignments, cap);
  if(feasible) {
    if(plan.mode === 1) {
      schedule_assignmentMode(assignments, plan, date, cap, total, method_ID);
    } else if(plan.mode === 2) {
      schedule_balancedMode(assignments, plan, date, cap, total, method_ID);
    } else if(plan.mode === 3) {
      schedule_revisionMode(assignments, plan, date, cap, total, method_ID);
    }
  } else {
    // TODO: Force the user to make sacrifices or different choices
    let choice = prompt("It looks like you are trying to schedule more hours than you have available. Please select an option 1-3.");
    switch(choice) {
      case 1: // Increase the daily cap
      case 2: // Decrease the daily workload
      case 3: // Proceed with fewer hours and give priority to higher CAT point subjects (20 cred modules)
    }
  }

}

/* CREATE CALENDAR EVENTS ***********************************************************/
// Plan subjects and breaks for the day
function scheduleBatchSubjects(date, assignments, cap, total, plan, id) {
  var sessionLength, tempName, tempCode, tempColour;

  // TODO: Splicing is a good start. planRevision sessions needs to be called once though
  for(var i=0; i<assignments.length; i++) { // Looping over each subject
    // Check to see if this is an exam, that will need backwards processing
    if(assignments[i].type !== "done") { // Exam, plan backwards
      setDeadlineReminder(assignments[i], plan);
      assignments[i].type = "done";
    }

    date = new Date(date.getTime() + (60*60*1000) / 4); // Add a 15 min break between the last thing
    // Increment the date by checking to see if it has exceeded the daily finish time
    //if (date.getHours() >= plan.endTime.substring(0, 2)) { date = incrementDay(date, plan); }

    // Check if the user wants to schedule study on weekend days
    if (plan.weekends === "off") { date = skipWeekendDays(date, plan); }

    // TESTED: WORKING: Get the display attributes
    tempName = assignments[i].moduleName;
    tempCode = assignments[i].moduleCode;
    tempColour = assignments[i].color;
    sessionLength = assignments[i].avg; // It'll be something like 1hr - 3hr

    // Not necessary if scheduling by average, so only fires if one of them got here via the refactoring method
    if(id === 2) { // Only if it can't sequentially schedule within the given time

      // Check to make sure the session will not overrun the day, and switch to something shorter if so
      let hrsLeft = getTimeRemainingInDay(date, plan);
      if(hrsLeft < sessionLength) {
        function findShorterSession(assignments) {
          for(let x=0; x<assignments.length; x++) {
            if(assignments[x].avg < sessionLength) {
              return x;
            } else {
              // Proceed to next
            }
          }
          return undefined; // If no match found
        }
        let x = findShorterSession(assignments);
        if(isNaN(x)) {
          incrementDay(date, plan);
          if(plan.weekends === "off") { date = skipWeekendDays(date, plan); }
        } else {
          tempName = assignments[x].moduleName;
          tempCode = assignments[x].moduleCode;
          tempColour = assignments[x].color;
          sessionLength = assignments[x].avg;
        }
      } // Finds another subject to fill time with

      // Check if the finish time is going to exceed the daily limit
      let provisionalDate = new Date(date.getTime() + (sessionLength * (60*60*1000))); // + sessionLength in hrs
      if(provisionalDate.getHours()-1 >= plan.endTime.substring(0,2)) { // -1 to get the right hour
        date = incrementDay(date, plan); // Move to next day
        if(plan.weekends === "off") { date = skipWeekendDays(date, plan); } // To stop overlap onto a Saturday
      }
    }

    var exactStartTime = stringBuilder(date); // Turn the start time into a calendar-readable format
    //alert("Exact Start Time String: " + exactStartTime);

    // Increment the rolling date to determine the finish time
    var nextDate = new Date(date.getTime() + (sessionLength * (60 * 60 * 1000))); // + x number of hours
    var exactFinishTime = stringBuilder(nextDate);
    let notes = "Automatically generated study session for " + tempCode + ": " + tempName;

    // Create the event and decrement the quota
    createStudySessionEvent(tempName, tempCode, exactStartTime, exactFinishTime, tempColour, notes);
    // TEST FOR KEEPING TRACK OF PLANNED HOURS: assignments[i].hoursPlanned += sessionLength;
    assignments[i].quota -= sessionLength; // Decrement the quota

    // Date Operations: Update the time then add a proportional break relative to the workload
    date = nextDate; // Update the time after the session has been added
    let breakLength = addBreak(cap, total, assignments.length, plan, id); // Add a break between study sessions
    date = new Date(date.getTime() + (60 * 60 * 1000) * breakLength); // + x number of break hours

    // Check to see if the current assignment has any work left to plan, and then remove it if not
    var done = checkQuota(assignments[i].quota);
    if (done) {
      // TEST FOR KEEPING TRACK OF PLANNED HOURS: alert(assignments[i].hoursPlanned);
      assignments.splice(i, 1);
    }
  }
  return date;
  // TODO: Add a check to see if the date before the last session exceeds the due date of the module
}

// Schedule Mode 1: Assignment mode (long blocks, extended study sessions of subjects
function schedule_assignmentMode(assignments, plan, date, cap, total, id) {
  let complete = false;

  // Double up all averages for assignment mode
  assignments.forEach(function(e) {
    e.avg = e.avg * 2;
    if(e.avg >= cap / 2) {
      e.avg = ((cap/2) -1); // Adding a decrement to ensure the user has free time during the day if one of their subjects exceeds 50% of their day
    }
  });
  assignments = sortByDeadline(assignments, 1); // Sort the assignments according to the soonest

  // Schedule until everything is done
  while(complete === false) {
    date = scheduleBatchSubjects(date, assignments, cap, total, plan, id);
    if(date.getDay() % 2 === !0) {
      assignments = sortByDeadline(assignments, 1); // If day is odd, sort by soonest
    } else {
      assignments = sortByDailyAverage(assignments,1); // The most workload
    }
    assignments.reverse();
    complete = checkAllQuotas(assignments);
  }
  alert("Scheduling finished");
}

// Schedule Mode 2: Balanced (long and short blocks, whatever works really)
function schedule_balancedMode(assignments, plan, date, cap, total, id) {
  let quotasComplete = false;
  assignments = sortByWorkload(assignments, 1); // Sort the assignments so the highest workload is at the front (Mode 1 = high-low, Mode -1 = low-high)
  //TESTED: Working alert(assignments[0].moduleName);
  //assignments[0].avg = assignments[0].avg +1; // Give extra bit of priority to the highest workload subjects

  // Swap the longest session with the second longest or it might cause unnecessary 3-hour slot skips in the day
  let t1 = assignments[1];
  assignments[1] = assignments[0];
  assignments[0] = t1;

  // Schedule the sorted array
  while(quotasComplete === false) {
    //plan.weekends = "off"; // TEST
    date = scheduleBatchSubjects(date, assignments, cap, total, plan, id);
    assignments = randomise(assignments); // assignments.reverse();
    quotasComplete = checkAllQuotas(assignments);
  }
  alert("Scheduling Finished.");
}

// Schedule Mode 3: Revision mode (short blocks, never keep anything too long, could just cycle through 1hr sessions)
function schedule_revisionMode(assignments, plan, date, cap, total, id) {
  let assignments_done = false;

  assignments = randomise(assignments);
  assignments.forEach(function(e) {
    e.avg = 1; // Setting the session length for all subjects
  });

  while(assignments_done === false) {
    date = scheduleBatchSubjects(date, assignments, cap, total, plan, id);
    assignments = randomise(assignments);
    assignments_done = checkAllQuotas(assignments);
  }

  alert("Scheduling finished.");

}

function setDeadlineReminder(assignment, plan) {
  // Set reminder metrics
  const hr = 60*60*1000; // millisecond hour to save typing
  let e_date = new Date(assignment.dueDate + " " + "00:00");
  let end_date = new Date(e_date.getTime() + ms_day);

  let code, name, start, finish, colour, notes;
  code = assignment.moduleCode; // Both the same
  start = stringBuilder(e_date); //stringBuilder(examDate);
  finish = stringBuilder(end_date); //stringBuilder(ef);

  // Determines what kind of reminder to add, whether it's A or E
  if(assignment.type === "E") {
    // Exam event details
    name = "EXAM: " + assignment.moduleCode;
    colour = "Red";
    notes = "Examination for " + code + ": " + assignment.moduleName;
  } else if(assignment.type === "A") {
    colour = "Black";
    name = "DEADLINE: " + assignment.moduleCode + " hand-in";
    notes = "Examination for " + code + ": " + assignment.moduleName;
  }

  // Create the event
  createStudySessionEvent(name, code, start, finish, colour, notes);
}

// Create a study session. Not necessarily required to be its own function but helpful if it's reusable.
function createStudySessionEvent(title, code, start, finish, color, notes) {
  // Create the event
  //alert("Inside the creation method: " + title + " " + code + " " + start + " " + finish + " " + color + " " + notes)

  let temp_ID = code + evt_count;
  let dateCreated = new Date();

  // Check for collisions with exams
  var proposedSession = {
    startTime: start,
    finishTime: finish
  };
  //alert(proposedSession.startTime + " " + proposedSession.finishTime);
  let col = checkCalendarCollision(proposedSession);
  if(col) {
    // Do nothing
  } else {
    scheduler.addEvent({
      id: temp_ID,
      start_date: start,
      end_date: finish,
      text: title,
      code: code,
      color: color,
      notes: notes, // Custom scheduler data
      created: dateCreated // Custom scheduler data
    });
    evt_count++;
  }
}

// TODO: Not removing events properly
// TODO: Extend to reschedule events, not just remove them
function checkCalendarCollision(proposedSession) { // Object with attributes to query
  let d = proposedSession.startTime.substring(0,10).trim();
  let t = proposedSession.startTime.substring(10, 16).trim();

  function swapDate(startTime) {
    let strs = startTime.split("-");
    let day = strs[0];
    let month = strs[1];
    let year = strs[2];
    let str = month + "-" + day + "-" + year;
    return str;
    // Split using : as the delimiter to get the day - month - year
    // Then swap them around to month - day - year
    // Return str
  }
  let str = swapDate(d); // Month and day swapped around
  let actualDate = new Date(str + " " + t); // Should be fixed
  //alert(actualDate);

  let proposed_start = new Date(proposedSession.startTime);
  let proposed_finish = new Date(proposedSession.finishTime);

  let evs = scheduler.getEvents(); // Get all the events
  evs.forEach(function(ev) {
    let currentEvStart = ev.start_date; let currentEvEnd = ev.end_date;
    let hr_diff = (currentEvEnd.getTime() - currentEvStart.getTime()) * (60*60*1000);

    //alert(proposed_start + " " + currentEvStart);
    if(proposed_start.getTime === currentEvStart.getTime()) {
      alert("col");
      return true;
    }
  });
  return false;
}

// Show / Hide assignments using the filters
function showStudySessionGroup(cb_val, mode, assignments) { // 1- Checked / -1- Hide ID = Checkbox value
  var evs = scheduler.getEvents(); // Get a collection of all the events
  var modCode = cb_val.substring(0, 5); // Get the module code from the request
  let tempCode = cb_val.substring(5,6);

  if(mode===1) {
    //alert("Box checked");
    evs.forEach(function (event) {
      let tempLetter = event.text.substring(0,1); // Direct match
      if (event.code === modCode && tempCode === tempLetter) { // If event is CI301, show all CI301
        //alert(event.code + " " + modCode);
        let this_name = event.text;
        // alert(this_name);
        let i = getAssignmentByName(assignments, this_name);
        scheduler.getEvent(event.id).color = assignments[i].color;
        scheduler.updateEvent(event.id);
      }
    });

  } else if(mode===-1) {
    //alert("Box unchecked");
    evs.forEach(function (event) {
      let tempLetter = event.text.substring(0,1); // Direct match
      if (event.code === modCode && tempCode === tempLetter) {
        scheduler.getEvent(event.id).color = "White";
        scheduler.updateEvent(event.id);
      }
    });
  }

}

/**********************************************************************************************************************/
/********************************************* MINOR FUNCTIONALITY ****************************************************/
/**********************************************************************************************************************/

/* SORTING **********************************************************************/
// Sort the assignments so that the highest workload subjects are first in the queue
function sortByWorkload(assignments, mode) { // 1- Highest-Lowest / -1- Lowest-Highest

  // Sort the objects by descending quota
  function compare(a,b) {
    var quota1 = a.quota;
    var quota2 = b.quota;
    let comparison = 0;
    if(quota1 > quota2) {
      comparison = mode * -1;
    } else if(quota1 < quota2) {
      comparison = mode;
    }
    return comparison;
  }
  assignments.sort(compare);
  return assignments;
}

// Sort by average workload (1- Most hrs - least hrs // -1- Least hrs - most hrs
function sortByDailyAverage(assignments, mode) { // 1- Highest-Lowest / -1- Lowest-Highest
  function compare(a,b) {
    let av1 = a.avg;
    let av2 = b.avg;
    let comp;
    if(av1 > av2) {
      comp = mode * -1;
    } else if(av1 < av2) {
      comp = mode;
    }
    return comp;
  }
  assignments.sort(compare);
  return assignments;
}

// Sort by soonest deadline and furthest deadline (Mode 1- Soonest - Furthest / -1- Furthest - Soonest
function sortByDeadline(assignments, mode) {
  function compare(a,b) {
    let d1 = new Date(a.dueDate);
    let d2 = new Date(b.dueDate);
    let dComp;
    //alert(d1 + "\n" + d2);
    if(d1.getTime() > d2.getTime()) {
      dComp = mode * -1;
    } else if(d1.getTime() < d2.getTime()) {
      dComp = mode;
    }
    return dComp;
  }
  assignments.sort(compare);
  return assignments;
}

// Randomise the elements of an array
function randomise(arr) {
  for(let i= arr.length-1; i>0; i--) {
    let j = Math.floor(Math.random() * (i+1));
    let t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/* GETTERS *********************************************************************/
// Get information about a particular subject by one of its attributes
// TODO: Assumes that two assignments don't have the same name
function getAssignmentByName(assignments, param) {
  for(var i=0; i<assignments.length; i++) {
    if(assignments[i].moduleName === param) {
      return i;
    }
  }
}

// Get highest workload
function getHighestWorkload(assignments) {
  let highestQuota = 0;
  let subject;

  for(var i=0; i<assignments.length; i++) {
    if(assignments[i].quota > highestQuota) {
      subject = assignments[i];
      highestQuota = assignments[i].quota;
    }
  }
  return subject;
}

// TODO: Got to check this to see if it has problems handling just one subject
function getLowestWorkload(assignments) {
  let lowestQuota = assignments[0].quota;
  let subject;

  for(var i=0; i<assignments.length; i++) {
    if(assignments[i].quota <= lowestQuota) {
      subject = assignments[i];
      lowestQuota = assignments[i].quota;
    }
  }
  return subject;
}

// Get the latest / earliest deadlines and return
function getFurthestDeadline(assignments) {
  let furthestDeadline = new Date(assignments[0].dueDate);
  let subject;

  let currentDeadline = new Date();
  for(var i=1; i<assignments.length; i++) {
    currentDeadline = new Date(assignments[i].dueDate);
    if(currentDeadline.getTime() > furthestDeadline.getTime()) {
      subject = assignments[i];
      furthestDeadline = currentDeadline;
    }
  }
  return subject;
}

// TODO: Got to check this to see if it has problems handling just one subject
function getSoonestDeadline(assignments) {
  let soonestDeadline = new Date(assignments[0].dueDate);
  let subject;

  for(let i=1; i<assignments.length; i++) {
    let currentDeadline = new Date(assignments[i].dueDate);
    if(currentDeadline.getTime() <= soonestDeadline.getTime()) {
      subject = assignments[i];
      soonestDeadline = currentDeadline;
    }
  }
  return subject;
}

// Get the daily average workload in hours for a particular module and round up
function getDailyAverage(module, weekends) {
  var req_hours = module.quota;
  var d = module.dueDate;
  var daysUntil = getDaysUntilDeadline(d, cd);

  if(weekends === "off") { // TODO: This thing isn't working
    let weekdaysUntil = ((daysUntil / 7) * 5);
    return (Math.ceil(req_hours / weekdaysUntil));
  } else {
    return Math.ceil(req_hours / daysUntil);
  }

}

// Get the days until the deadline from the current date (getCurrentDay)
function getDaysUntilDeadline(deadline, currentDate) {
  //alert(currentDate);
  let dl = new Date(deadline);
  let timeDiff = dl.getTime() - currentDate.getTime();
  return timeDiff / (1000*60*60*24);
}

/* FEASIBILITY *****************************************************************/
// Determine the feasibility of all daily avgs vs daily cap (8)
function determineOverallFeasibility(assignments, cap) {
  // Work out the overall workload
  let overallWorkload = 0;
  for(let i=0; i<assignments.length; i++) {
    overallWorkload = overallWorkload + assignments[i].quota;
  }

  // Work out the time until the last deadline
  let lastDeadline = getFurthestDeadline(assignments);
  let days = getDaysUntilDeadline(lastDeadline.dueDate, cd);
  let totalHrs = (days * cap);

  return overallWorkload <= totalHrs;
}

/* CHECKS **********************************************************************/
// Check to see if all the quotas are 0
function checkQuota(quota) {
  return quota <= 0;
}

function checkAllQuotas(assignments) {
  // Operate on each subject
  if(assignments.length === 0) {
    return true;
  } else {
    for(let i=0; i<assignments.length; i++) {
      if(assignments[i].quota > 0) {
        return false;
      }
    }
    return true; // Unreachable if any subject has outstanding work to do
  }
}

/* TIME OPERATIONS *************************************************************/
// Reset the day using the resetDate method if the time has exceeded the daily threshold
function incrementDay(date, plan) {
  let d = new Date(date.getTime() + ms_day);  // + 24 hours
  let str = resetDate(d);
  let nextDate = new Date(str + " " + plan.startTime); // Use the reset day
  return nextDate;
}

// If the weekends setting is marked as "off" on the schedule plan, check the day and skip to Monday if it's a weekend day
function skipWeekendDays(date, plan) {
  if(date.getDay() === 6) {
    date = incrementDay(date, plan);
    date = incrementDay(date, plan);
  } else if(date.getDay() === 0) {
    date = incrementDay(date, plan);
  }
  return date;
}

// Determine the length of proportional breaks based on the daily workload
function addBreak(cap, total, moduleCount, plan, id) {

  // This is a set of scenario-specific rules pertaining to each mode and workload. No real methodology as such
  //alert(total + " " + cap);

  // TODO: Extend to put breaks between 3hr sessions of the same subject at the end
  // todo: If modulecount = 2 then 1hr break (because each session should be (cap/2)-0.5hr if moduleCount = 2

  switch(id) {
    case 1: // ScheduleByAvgs - combined total < cap -- Returns a break length proportional to the workload
      let freeHrs = cap - total;
      return freeHrs / moduleCount;

    case 2: // RefactorStudy
      switch(plan.mode) {
        case 1: // Assignment Mode
          if(plan.weekends === "off") {
            if(moduleCount <= 2) {
              return 1;
            } else {
              return 0.5;
            }
          } else {
            return 1;
          }

        case 2: // Balanced mode
          if(total > cap || moduleCount > cap) {
            return 0.25;
          } else if(moduleCount > 2 && moduleCount < 6) {
            let freeHrs = cap - total;
            return freeHrs / moduleCount;
          } else {
            return 0.5;
          }

        case 3: // Revision mode
          return 0.25; // Revision Mode
      }
  }

}

// Returns the amount of hours left in a day until the daily finish time
function getTimeRemainingInDay(date, plan) {
  return plan.endTime.substring(0, 2) - date.getHours();
}

// Find the time difference between two times
function getHourDifference(t1, t2, date) {
  // Create the date format
  let timeStart = new Date(date + " " + t1).getHours();
  let timeStop = new Date(date + " " + t2).getHours();
  return timeStop - timeStart;
}

/* ARITHMETIC ******************************************************************/
// Sum the values in a given array
function sumArrayValues(arr) {
  var sum = arr.reduce(function(a, b) {
    return a + b;
  }, 0);
  return sum;
}

/* FORMATTING ******************************************************************/
// Build a string in the format the scheduler can use rather than the BS JS format
function stringBuilder(date) {
  var string, day, month, year, time, hrs, sec;

  day = date.getDate(); // Gets day as a number
  month = date.getMonth() + 1; // Gets the month
  if(month < 10) { month = "0" + month; }

  year = date.getFullYear(); // Gets year in YYYY format

  hrs = date.getHours();
  sec = date.getSeconds();

  if(hrs < 10) { hrs = "0" + hrs; }
  if(sec < 10) { sec = "0" + sec; }

  time = hrs + ":" + sec;

  string = day + "-" + month + "-" + year + " " + time;
  return string;
}

// Get the date without the time stamp in string format
function resetDate(d) {
  let yy, mm, dd;
  yy = d.getFullYear();
  mm = d.getMonth() + 1;
  dd = d.getDate();
  let str = yy + "-" + mm + "-" + dd;
  return str;
}

/**********************************************************************************************************************/
/*********************************** GET / POPULATE STUFF FROM THE DATABASE *******************************************/
/**********************************************************************************************************************/

// Fill the assignments array from the database
function populateAssignmentsArray() {
  // THE ONLY THING THAT SHOULD HANDLE THE DATABASE- SHOULD POPULATE AN ARRAY OF ASSIGNMENTS AND QUOTAS WHICH MIRRORS THE DB STRUCTURE
  let db = []; // Empty array that PHP will fill with values
  var assignments = [];
  // db.ajax whatever

  let title, code, catPoints, colour, deadline, thisType;
  for(let i; i<db.length; i++) {
    let obj = {
      moduleName: title,
      moduleCode: code,
      quota: (catPoints*10),
      color: colour,
      dueDate: deadline,
      type: thisType
    };
    assignments.push(obj);
  }
  return assignments;
}

// Save the calendar as a JSON String and send to DB
function saveCalendar() {
  var longText = scheduler.toJSON();
  // XHTTP Request to SaveCalendar.php
}

// Load the JSON string from the DB and parse it in
function loadCalendar() {
  var xhttp_responseText = '';
  // New XHTTP Request to LoadCalendar.php
  if(xhttp_responseText !== '') {
    scheduler.parse(xhttp_responseText); // TODO: Double check this is the correct syntax
    return true;
  } else {
    return false;
  }
}
