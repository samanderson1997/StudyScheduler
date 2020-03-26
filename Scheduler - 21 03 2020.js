/**
  Changes since last Git upload:
 - Added a function to skip weekend days if the user has specified this in their schedule plan
 - Completed mode 1: Assignment Mode (schedule long blocks of study, completing subjects very quickly)



 */


/**********************************************************************************************************************/
/*********************************************** PROCEDURAL CALLS *****************************************************/
/**********************************************************************************************************************/

// Initialise the calendar
var currentDate = "09-23-2019"; // = new Date(); will set to current date
scheduler.config.first_hour = 8;
scheduler.config.last_hour = 24;
scheduler.init('scheduler_here', new Date(currentDate), "week"); // Starts at the start of term

const ms_day = (24*(60*60*1000)); // Use to add a day

// Set up the scheduler and on-screen content
configureSetup(); // Checks for GET request with schedule instructions
initialiseSideBarCells(); // Initialise the viewport elements at the side

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
    // mode: 1, // Assignment mode
    startTime: "08:00",
    endTime: "16:00",
    weekends: "on" // If true then will use wknds, if false then ignores Saturday and Sunday
  };

  var extendedAssignments = [m1={
    moduleCode: "CI301",
    moduleName: "The Individual Project",
    quota: 400,
    color: "Black",
    dueDate: "2020-05-20" },

    m2={ moduleCode: "CI360",
    moduleName: "Mobile App Development",
    quota: 200,
    color: "Green",
    dueDate: "2020-03-01"},

    m3={ moduleCode: "CI315",
    moduleName: "Design Patterns",
    quota: 100,
      color: "Orange",
      dueDate: "2020-01-28"},

    m4={ moduleCode: "CI315",
      moduleName: "Software Architecture",
      quota: 100,
      color: "Brown",
      dueDate: "2020-06-01" },

    m5={ moduleCode: "CI312",
      moduleName: "Computer Graphics Algorithms",
      quota: 100,
      color: "Purple",
      dueDate: "2019-12-12"
    },

    m6={ moduleCode: "CI316",
    moduleName: "Software Validation",
    quota: 100,
      color: "Gray",
      dueDate: "2020-05-31"
    }
    ]; // A large block of stuff to plan to test the refactorStudy assignment();

  //work_planner(test_assignments, scheduledPlan); // For testing normal scheduling
  work_planner(extendedAssignments, scheduledPlan); // For testing refactored scheduling
}

/**********************************************************************************************************************/
/********************************************** ON-SCREEN CONTENT *****************************************************/
/**********************************************************************************************************************/

// Call the functions
function initialiseSideBarCells() {
  populateFilters();
  populateProgressMetres();
}

// Populate sidebar filters
function populateFilters(assignments) {

}

// Populate progress metres
function populateProgressMetres(assignments) {
  assignments.forEach(function(e) {
    let daysUntil = getDaysUntilDeadline(e.dueDate);
    // HTML append a progress bar with appropriate classes
  });
}

/**********************************************************************************************************************/
/********************************************* MAJOR FUNCTIONALITY ****************************************************/
/**********************************************************************************************************************/
/* ASSEMBLY OF SCHEDULER PARTS *****************************************************/
// Main functionality for scheduling with a given plan and list of assignments
function work_planner(assignments, scheduledPlan) {

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
  }

  //alert(total); // TESTED: WORKING

  // Determine scheduling method
  if(total <= cap) { // < 8 or 6- good!
    scheduleByAvgs(assignments, scheduledPlan, cap, total);
  } else { // Long
    refactorStudy(assignments, scheduledPlan, cap, total);
  }

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
  var dailyStartTime = scheduleDetails.startTime; // 08:00
  var dailyFinishTime = scheduleDetails.endTime; // 16:00
  var rolling_date = new Date(currentDate + " " + dailyStartTime);
  var quotasComplete = false;

  while (quotasComplete === false) {
    // TODO: Can use the scheduleBatchSubjects with only a small section of assignments, but will need to adjust the averages too
    // Should be able to take an undetermined amount of assignment objects and schedules them, to be used by the RefactorStudy method

    // TODO: Could alternate between 1 day scheduled by avgs and another scheduled by mode
    scheduleBatchSubjects(rolling_date, assignments, cap, total, scheduleDetails); // Decrements quotas internally
    rolling_date = new Date(rolling_date.getTime() + ms_day);  // Increment the date and move to the next day

    // TODO: FIX THIS DATE INCREMENTER, maybe use true / false values to test
    //rolling_date = incrementDay(rolling_date, scheduleDetails.endTime);

    quotasComplete = checkAllQuotas(assignments);
    assignments.reverse(); // Reverse the arrays to mix it up each time
  }
  alert("Scheduling complete.");
}

// If daily averages exceed the daily cap, then ah whatever we'll come back to this.
function refactorStudy(assignments, plan, cap, total) {
  var date = new Date(currentDate + " " + plan.startTime); // Create a rolling date
  schedule_revisionMode(assignments, plan, date, cap, total);


  /** Feasibility checks
  let feasible = determineOverallFeasibility(assignments, cap);
  if(feasible) {
    switch(plan.mode) { // Determining by the modes
      // Divide up the assignments array into certain partitions of objects
      // Send these partitions into the scheduleBatchSubjects method
      case 1: schedule_assignmentMode(assignments, plan, date, cap, total);
      case 2: schedule_balancedMode(assignments, plan);
      case 3: schedule_revisionMode(assignments, plan);
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
   */
}

/* CREATE CALENDAR EVENTS ***********************************************************/
// TODO: Fix issues with Daylight Savings offset
// TODO: Mix it up so it doesn't create the same plan every day
// Plan subjects and breaks for the day
function scheduleBatchSubjects(date, assignments, cap, total, plan) {
  var sessionLength, tempName, tempCode, tempColour;


  assignments.forEach(function(module) {

    // Check if the user wants to schedule study on weekend days
    if(plan.weekends === "off") {
      date = skipWeekendDays(date, plan);
    }

    // Get the display attributes
    tempName = assignments[i].moduleName;
    tempCode = assignments[i].moduleCode;
    tempColour = assignments[i].color;
    sessionLength = assignments[i].avg; // It'll be something like 1hr - 3hr


  });

  for(var i=0; i<assignments.length; i++) { // Looping over each subject

    // Check if the user wants to schedule study on weekend days
    if(plan.weekends === "off") {
      date = skipWeekendDays(date, plan);
    }

    // TESTED: WORKING: Get the display attributes
    tempName = assignments[i].moduleName;
    tempCode = assignments[i].moduleCode;
    tempColour = assignments[i].color;
    sessionLength = assignments[i].avg; // It'll be something like 1hr - 3hr

    var exactStartTime = stringBuilder(date); // Turn the start time into a calendar-readable format

    // Increment the rolling date to determine the finish time
    var nextDate = new Date(date.getTime() + (sessionLength * (60*60*1000))); // + x number of hours
    var exactFinishTime = stringBuilder(nextDate);
    let notes = "Automatically generated study session for " + tempCode + ": " + tempName;

    // Create the event and decrement the quota
    createStudySessionEvent(tempName, tempCode, exactStartTime, exactFinishTime, tempColour, notes);
    assignments[i].quota -= sessionLength; // Decrement the quota

    // Date Operations: Update the time then add a proportional break relative to the workload
    date = nextDate; // Update the time after the session has been added
    let breakLength = addBreak(cap, total, assignments.length); // Add a break between study sessions
    date = new Date(date.getTime() + breakLength * (60*60*1000)); // + x number of break hours

    // Increment the date by checking to see if it has exceeded the daily finish time
    if(date.getHours() >= plan.endTime.substring(0, 2)) {
      date = incrementDay(date, plan);
    }

    // Check to see if the current assignment has any work left to plan, and then remove it if not
    var done = checkQuota(assignments[i].quota);
    if(done) {assignments.splice(i, 1); }
  }
  return date;

}



// Schedule Mode 1: Assignment mode (long blocks, extended study sessions of subjects
function schedule_assignmentMode(assignments, plan, date, cap, total) {
  let soonestDeadlineSubject, lowestWorkloadSubject;
  let quotasDone = false;
  let currentQuotasDone = false;
  var modified_assignment_block = []; // Create a new array with the two appropriate subjects and update their averages

  while(assignments !== []) {
    // TODO: Leave an hr slot for the highest priority
    // TODO: Add a check to make sure they're not the same deadline
    // Get the nearest deadline and the lowest workload deadline and increase their daily workloads
    soonestDeadlineSubject = getSoonestDeadline(assignments);
    lowestWorkloadSubject = getLowestWorkload(assignments);

    // TODO: This might not be working- the getters for the lowest workload / soonest deadline might not be working either
    // If they are duplicated, priority to be given to the soonest deadline
    if(soonestDeadlineSubject === lowestWorkloadSubject) {
      //alert("Duplicate subject error.");
      let i = getSubjectInfoByAttribute(assignments, lowestWorkloadSubject.moduleName);
      let amended_subs = assignments;
      amended_subs.splice(i, 1); // Check if this works
      lowestWorkloadSubject = getLowestWorkload(amended_subs);
      // alert(lowestWorkloadSubject.moduleName + " " + soonestDeadlineSubject.moduleName);
    }

    let newAvg_1 = soonestDeadlineSubject.avg * 2;
    let newAvg_2 = lowestWorkloadSubject.avg * 2;
    // alert(newAvg_1 + " " + newAvg_2); // TESTED: WORKING

    // New batch of assignments to schedule
    modified_assignment_block.push(soonestDeadlineSubject, lowestWorkloadSubject);
    modified_assignment_block[0].avg = newAvg_1;
    modified_assignment_block[1].avg = newAvg_2;

    // Schedule these two temporary subjects
    while(currentQuotasDone === false) {
      date = scheduleBatchSubjects(date, modified_assignment_block, cap, total, plan);
       // Check to see if the current quotas have been done
      currentQuotasDone = checkAllQuotas(modified_assignment_block);
      modified_assignment_block.reverse(); // Reverse the arrays to mix it up each time
      // alert("Quotas Remaining: " + modified_assignment_block[0].moduleName + ": " + modified_assignment_block[0].quota + " & " + modified_assignment_block[1].moduleName + ": " + modified_assignment_block[1].quota);
    }

    // Get rid of the assignments from the original array when complete
    // TODO: Won't work for assignments with duplicate attributes
    let r = getSubjectInfoByAttribute(assignments, lowestWorkloadSubject.moduleName);
    let r2 = getSubjectInfoByAttribute(assignments, soonestDeadlineSubject.moduleName);
    assignments.splice(r, 1);
    assignments.splice(r2, 1);

    currentQuotasDone = false;
  }



  /**
   LOOP UNTIL ALL QUOTAS = DONE


   - Schedule this shortened day using scheduleBatchSubjects(modified_assignments), it will switch up the blocks
   This will allow long blocks of high-priority work, which will finish those subjects off quickly
   // TODO: Pop subjects which are done
   // TODO: Return the date at which the scheduling of these subjects are finished and use that as the next rolling_date

   - Take the next two subjects with the same parameters (or maybe different) and do the same thing again

   - Lastly, you'll be left with the high-priority subject to finish off
   */
}

// Schedule Mode 2: Balanced (long and short blocks, whatever works really)
function schedule_balancedMode(assignments, plan) {
  /**
   Try to aim for at least 3/4 subjects a day- more than would be done in mode 1 and fewer than mode 3
   */
}

// Schedule Mode 3: Revision mode (short blocks, never keep anything too long, could just cycle through 1hr sessions)
function schedule_revisionMode() {
  /**
   If the workload is less, say, 50/60% of the hours then can just cycle through subjects 1hr at a time

   - Start with the highest-priority (e.g. project). Give it 2hrs at the start of the day / end of the day

   - Next, schedule 1hr blocks with 30m breaks in between
   TODO: Check to make sure # of subjects < cap (realistically got time for about 4/5 a day at a push)

   - IF not all subjects can be planned into a single day (currentTime > dailyFinishTime), move onto the next day.
   - Then start again with like a 2-3hr break.

   - Reverse / switch up the array with each daily iteration (putting the 2hr high priority block at the beginning / end)

   TODO: Expand on this to accept a wider range of inputs and scenarios...
   */
}

// Assignments marked as revision for an exam will need to be planned backwards from the date.
// Might not need this if daily averages ends up being a major part but good to be aware of
function planRevisionSessions(assignment) {
  // Stringify the due date
  // minus ms_days from the date after scheduling and work backwards.
  // TODO: Add similar functionality that scheduleBatchSubjects has but decrement the days and plan backwards from the date
}

// Create a study session. Not necessarily required to be its own function but helpful if it's reusable.
function createStudySessionEvent(title, code, start, finish, color, notes) {
  // Create the event
  scheduler.addEvent({
    start_date: start,
    end_date: finish,
    text: title,
    code: code,
    color: color,
    notes: notes // Custom scheduler data
  });
}

/**********************************************************************************************************************/
/********************************************* MINOR FUNCTIONALITY ****************************************************/
/**********************************************************************************************************************/

/* GETTERS *********************************************************************/

// Get information about a particular subject by one of its attributes
// TODO: Won't work for duplicate quotas / due dates
function getSubjectInfoByAttribute(assignments, param) {
  var tempModule, tempName, tempQuota, tempDeadline;
  for(var i=0; i<assignments.length; i++) {
    tempModule = assignments[i].moduleCode;
    tempName = assignments[i].moduleName;
    // tempQuota = assignments[i].quota; // TODO: Removed because of so many duplicates
    tempDeadline = assignments[i].dueDate;

    if(tempModule === param || tempName === param || tempDeadline === param) {
      return i;
    }
  }
  // Unreachable if a match is found
  alert("No match found.");
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

// Get the latest / earliest deadlines and return them
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

function getSoonestDeadline(assignments) {
  let soonestDeadline = new Date(assignments[0].dueDate);
  let subject;

  let currentDeadline = new Date();
  for(var i=1; i<assignments.length; i++) {
    currentDeadline = new Date(assignments[i].dueDate);
    if(currentDeadline.getTime() < soonestDeadline.getTime()) {
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
  var daysUntil = getDaysUntilDeadline(d);

  if(weekends === "off") { // TODO: This thing isn't working
    let weekdaysUntil = ((daysUntil / 7) * 5);
    return (Math.ceil(req_hours / weekdaysUntil));
  } else {
    return Math.ceil(req_hours / daysUntil);
  }


}

// Get the days until the deadline from the current date (getCurrentDay)
function getDaysUntilDeadline(deadline) {
  let dl = new Date(deadline);
  let cd = new Date(currentDate);
  let timeDiff = dl.getTime() - cd.getTime();
  return timeDiff / (1000*60*60*24);
}

/* FEASIBILITY *****************************************************************/
// Determine the feasibility of all daily avgs vs daily cap (8)
function determineOverallFeasibility(assignments, cap) {

  // Work out the overall workload
  let overallWorkload = 0;
  assignments.forEach(function(e) {
    overallWorkload = overallWorkload + e.quota;
  });

  // Work out the time until the last deadline
  let lastDeadline = getFurthestDeadline(assignments);
  let days = getDaysUntilDeadline(getFurthestDeadline(assignments));
  let totalHrs = (days * cap);
  //alert(totalHrs);

  return overallWorkload <= totalHrs;

}

/* CHECKS **********************************************************************/
// Check to see if all the quotas are 0
function checkQuota(quota) {
  return quota <= 0;
}
function checkAllQuotas(assignments) {
  for(var i=0; i<assignments.length; i++) {
    if(assignments[i].quota > 0) {
      return false;
    }
  }
  return true;
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
// TODO: Extend to be more comprehensive
function addBreak(cap, total, moduleCount) {
  if(moduleCount > 2) {
    var freeHrs = cap - total;
    return Math.round(freeHrs / moduleCount);
  } else {
    return 1;
  }
}

// Find the time difference between two times
function getHourDifference(t1, t2, date) {

  // Create the date format
  var timeStart = new Date(date + " " + t1).getHours();
  var timeStop = new Date(date + " " + t2).getHours();

  return timeStop - timeStart;
}

function offsetDaylightSavings(date) {
  // if date > DST
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

  let title, code, catPoints, colour, deadline;
  for(let i; i<db.length; i++) {
    let obj = {
      moduleName: title,
      moduleCode: code,
      quota: (catPoints*10),
      color: colour,
      dueDate: deadline
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
