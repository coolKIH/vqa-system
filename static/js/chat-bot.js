// (function () {
String.prototype.zfill = function (maxWidth) {
    var str = this.toString();
    while (str.length < maxWidth) {
        str = '0' + str;
    }
    return str;
};

function getDateString(dateObj) {
    return [String(dateObj.getFullYear()), String(dateObj.getMonth() + 1).zfill(2), String(dateObj.getDate()).zfill(2)].join('-')
}

function getTimeString(dateObj) {
    return [String(dateObj.getHours()).zfill(2), String(dateObj.getMinutes()).zfill(2), String(dateObj.getSeconds()).zfill(2)].join(':')
}

function getFullTimeString(dateObj, smart) {
    var str = getDateString(dateObj);
    if (smart) {
        if (!dateObj.getHours() && !dateObj.getMinutes() && !dateObj.getSeconds()) {
            return str;
        }
    }
    return str + ' ' + getTimeString(dateObj);
}

var chatBoxElem = document.getElementById('chatBox');
var chatInputContainer = document.getElementById('chatInputContainer');
var sessionsContainer = document.getElementById('sessions');
var chatContainer = document.getElementById('chatContainer');
var navigation = document.getElementById('navigation');

var chatInputStates = {
    textUnskippable: 1,
    textSkippable: 2,
    singleSelect: 3,
    lock: 4,
    timeRangePicker: 5
};
var sessionSenders = {
    self: 1,
    oppo: 2
};
var stateNames = {
    serviceChooser: 1,
    askName: 2,
    askPhone: 3,
    askEmail: 4,
    askLawAreas: 5,
    askLawSubCate: 6,
    askWhenHappened: 7,
    askWhatHappened: 8,
    askIfMoreEvent: 9,
    checkLegalAnal: 10,
    askQuestion: 11,
    listSuitableLawyers: 12,
    askYNNSeries: 13,
    createMaterial: 14,
    askDocuments: 15,
    waitForUploading: 16,
    waitForQuestion: 17
};
var buttonRoles = {
    doRespond: 'doRespond'
};
var cursor = {
    lastSession: null,
    lastState: null
};
var selectors = {
    dataRole: '[data-role]'
};
var sep = '|';

var lawAreasFull = [
    'Administrative Law',
    'Arbitration / Mediation',
    'Bankruptcy',
    'Banking & Finance',
    'Building Management',
    'China Appointed Attesting Officer',
    'Civil Celebrants of Marriage',
    'Civil Claims',
    'Company / Commercial Law',
    'Consumer Protection',
    'Conveyancing',
    'Criminal Law',
    'Employment Law',
    'Family Law',
    'Foreign Related Legal Services',
    'Committeeship / Guardianship',
    'Immigration',
    'Intellectual Property',
    'Landlord & Tenant',
    'Mainland Related Legal Services',
    'Notary Public',
    'Personal Injuries',
    'Shipping & Maritime',
    'Wills & Probate'
];

var lawAreasToNb = {};
lawAreasFull.forEach(function (value, index) {
    lawAreasToNb[value] = index + 1;
});

var documentCheckList = [
    'Form 2 Notice of Accident',
    'Labour Department Witness Statements',
    'Labour Department Accident Report',
    'Form 5, Form 7 and Form 9',
    'Medical reports',
    'Income proof (e.g. pay slips; statement obtained from employer; bank account etc.)',
    'Tax returns lodged with the Inland Revenue Department (e.g. ORSO and /or MPF statements)',
    'Copy Identity Card (for proof of age)',
    'Medical and other expense receipts'
];

var userData = {
    basic: {
        name: null,
        phoneNo: null,
        email: null,
        isProvided: false
    },
    lawArea: null,
    lawSubCate: null,
    eventSeries: null,
    supplements: null,
    questions: null,
    geolocation: {
        latitude: 22.2600478,
        longitude: 114.1312385
    }
};

var ongoing = {
    event: null,
    supplements: null
};

var lawAreas = ['Personal Injuries', 'Criminal',
    'Landlord & Tenant', 'Consumer Protection',
    'Conveyancing', 'Intellectual Property',
    'Wills & Probate', 'Others'];

var lawSubCate = ['Accidents at work', 'Road traffic accidents',
    'Medical negligence', 'Slip and fall accidents',
    'Assault', 'Dog bite', 'Others'];

var lawSubCateCls = {
    Accident_Info: 'Accident Information',
    Medical_Treatment_Records: 'Medical Treatment Records'
};

var lawSubCateSupplements = {
    'Accidents at work': [
        {
            q: 'Has the incident been reported to the Labour Department?',
            fulfillment: /labour department|department of labour|commissioner for labour/i,
            responses: [
                {display: 'Yes', val: 0, meaning: 'The incident has been reported to the Labour Department.'},
                {display: 'No', val: 1, meaning: 'The incident has not been reported to the Labour Department.'},
                {
                    display: 'Not sure',
                    val: 2,
                    meaning: 'I am not sure if the incident has been reported to the Labour Department.'
                }
            ],
            cls: lawSubCateCls.Accident_Info
        },
        {
            q: 'Did your employer prepare any incident report?',
            fulfillment: /incident report|accident report|report of incident|report of accident/i,
            responses: [
                {display: 'Yes', val: 0, meaning: 'My employer has prepared incident report(s).'},
                {display: 'No', val: 1, meaning: 'My employer has not prepared incident report(s).'},
                {
                    display: 'Not sure',
                    val: 2,
                    meaning: 'I am not sure if my employer has prepared incident report(s).'
                }
            ],
            cls: lawSubCateCls.Accident_Info
        },
        {
            q: 'Has anyone taken any photographs related to the incident?',
            fulfillment: /photos?|photographs?|pictures?/i,
            responses: [
                {display: 'Yes', val: 0, meaning: 'Photographs related to the incident has been taken.'},
                {display: 'No', val: 1, meaning: 'No photograph related to the incident has been taken.'},
                {
                    display: 'Not sure',
                    val: 2,
                    meaning: 'I am not sure if any photographs related to the incident has been taken.'
                }
            ],
            cls: lawSubCateCls.Accident_Info
        },
        {
            q: 'Do you have any sick leave certificates?',
            fulfillment: /sick leave/i,
            responses: [
                {display: 'Yes', val: 0, meaning: 'I have sick leave certificates.'},
                {display: 'No', val: 1, meaning: 'I do not have sick leave certificates.'},
                {
                    display: 'Not sure',
                    val: 2,
                    meaning: 'I am not sure if have sick leave certificates.'
                }
            ],
            cls: lawSubCateCls.Medical_Treatment_Records
        }
    ]
};

function setInputState(state, dataObj) {
    dataObj = dataObj || {};
    // {validation: {fulfillment: /[0-9]{3}/, warning: 'Please input a valid phone number.'}}
    chatInputContainer.innerHTML = '';
    switch (state) {
        case chatInputStates.textUnskippable:
            (function () {
                var val;
                var inputElem = document.createElement('input');
                inputElem.title = 'Type your response';
                inputElem.placeholder = 'Type your response...';
                inputElem.className = 'textResponse';

                inputElem.addEventListener('keydown', function (e) {
                    if (e.keyCode === 13 && (val = inputElem.value.trim())) {
                        sendResponse(val);
                    }
                });

                chatInputContainer.appendChild(inputElem);

                var buttonSendElem = document.createElement(('button'));
                buttonSendElem.className = 'sendButton';
                buttonSendElem.innerText = 'Send';

                buttonSendElem.addEventListener('click', function () {
                    if (val = inputElem.value.trim()) {
                        sendResponse(val);
                    } else {
                        inputElem.focus();
                    }
                });

                chatInputContainer.appendChild(buttonSendElem);

                inputElem.focus();
            })();
            break;
        case chatInputStates.textSkippable:
            (function () {
                var inputElem = document.createElement('input');
                var val;
                var regExpNo = /^(no|nah|nope)\.?$/i;
                inputElem.title = 'Type your response';
                inputElem.placeholder = 'Type your response...';
                inputElem.className = 'textResponse';

                inputElem.addEventListener('keydown', function (e) {
                    if (e.keyCode === 13) {
                        val = inputElem.value.trim();
                        if (val) {
                            if (regExpNo.test(val)) {
                                sendResponse(null);
                            } else {
                                sendResponse(val);
                            }
                        }
                    }
                });

                chatInputContainer.appendChild(inputElem);

                var buttonSendElem = document.createElement(('button'));
                buttonSendElem.className = 'sendButton';
                buttonSendElem.innerText = 'Send';

                buttonSendElem.addEventListener('click', function () {
                    if (val = inputElem.value.trim()) {
                        if (regExpNo.test(val)) {
                            sendResponse(null);
                        } else {
                            sendResponse(val);
                        }
                    }
                });

                chatInputContainer.appendChild(buttonSendElem);

                var buttonSkipElem = document.createElement('button');
                buttonSkipElem.className = 'sendButton minor';
                buttonSkipElem.innerText = dataObj.skipText || 'Skip';

                buttonSkipElem.addEventListener('click', function () {
                    sendResponse(null);
                });

                chatInputContainer.appendChild(buttonSkipElem);

                inputElem.focus();
            })();
            break;
        case chatInputStates.timeRangePicker:
            (function () {
                chatInputContainer.innerHTML = '<div class="pickers">' +
                    '<div class="pickerContainer"><div class="inputWrapper"><input placeholder="Pick a date" class="picker-date"></div><div class="inputWrapper"><input placeholder="Pick a time of day (optional)" class="picker-time"></div></div>' +
                    '</div>' +
                    '<button class="sendButton">Continue</button>';
                var $pickerDate = $(chatInputContainer).find('.picker-date').pickadate();
                var $pickerTime = $(chatInputContainer).find('.picker-time').pickatime();
                var dateObj, timeObj;
                $pickerDate = $pickerDate.pickadate('picker');
                $pickerTime = $pickerTime.pickatime('picker');
                $pickerDate.set('max', new Date());
                $(chatInputContainer).find('.sendButton').on('click', function () {
                    dateObj = $pickerDate.get('select');
                    timeObj = $pickerTime.get('select');
                    if (dateObj) {
                        dateObj = dateObj.obj;
                        if (timeObj) {
                            dateObj.setHours(timeObj.hour);
                            dateObj.setMinutes(timeObj.mins);
                        }
                        sendResponse(dateObj);
                    }
                });
                var buttonSkipElem = document.createElement('button');
                buttonSkipElem.className = 'sendButton minor';
                buttonSkipElem.innerText = dataObj.skipText || 'Skip';

                buttonSkipElem.addEventListener('click', function () {
                    sendResponse(null);
                });
                chatInputContainer.appendChild(buttonSkipElem);
            })();
            break;
        default:
            break;
    }
}

function sendResponse(response) {
    if (cursor.lastState) {
        cursor.lastState.doRespond(response);
    }
}

function setOnGoingState(stateName, precedingBubbleTexts, payload) {
    precedingBubbleTexts = [].concat(precedingBubbleTexts || []);
    var actionFn, respondFn, alwaysCall = function () {
        updateLastSession(sessionSenders.oppo);
        precedingBubbleTexts.forEach(function (bubbleElem) {
            appendElemToLastSession(createBubble(bubbleElem));
        });
    };
    switch (stateName) {
        case stateNames.serviceChooser:
            actionFn = function () {
                alwaysCall();
                var chatBoxOptions = createChatBoxOptions([
                    {val: 1, display: '1. Find a lawyer'},
                    {
                        val: 2,
                        display: '2. Prepare my case'
                    }]);
                appendElemToLastSession(chatBoxOptions);
                setInputState(chatInputStates.lock);
            };
            respondFn = function (optionVal) {
                optionVal = String(optionVal);
                updateLastSession(sessionSenders.oppo);
                if (optionVal === '1') {
                    appendBubble(['Loading law firm list. Please wait a moment.']);
                    setInputState(chatInputStates.lock);
                    getLawFirms(function (firms) {
                        appendElemToLastSession(createLawFirmViewer(firms));
                        setTimeout(function () {
                            appendBubble(['You are free to explore law firms. If you want to continue, you can always choose an option from the following.']);
                            setOnGoingState(stateNames.serviceChooser);
                        }, 0);
                    })
                } else if (optionVal === '2') {
                    setOnGoingState(stateNames.askName);
                }
            };
            break;
        case stateNames.askName:
            if (userData.basic.isProvided) {
                setOnGoingState(stateNames.askLawAreas, precedingBubbleTexts);
                return;
            }
            actionFn = function () {
                alwaysCall();
                appendBubble(['May I have your name? <span class="minor">(For lawyers to contact you only)</span>']);
                setInputState(chatInputStates.textUnskippable);
            };
            respondFn = function (val) {
                userData.basic.isProvided = true;
                userData.basic.name = val;
                updateLastSession(sessionSenders.self);
                appendBubble(val);
                setOnGoingState(stateNames.askPhone);
            };
            break;
        case stateNames.askPhone:
            actionFn = function () {
                alwaysCall();
                appendBubble('Hello, ' + userData.basic.name + '. What\'s your phone number? <span class="minor">(For lawyers to contact you only)</span>');
                setInputState(chatInputStates.textUnskippable, {
                    validation: {
                        fulfillment: /[0-9]{3}/,
                        warning: 'Please input a valid phone number.'
                    }
                });
            };
            respondFn = function (val) {
                userData.basic.phoneNo = val;
                updateLastSession(sessionSenders.self);
                appendBubble(val);
                setOnGoingState(stateNames.askEmail);
            };
            break;
        case stateNames.askEmail:
            actionFn = function () {
                alwaysCall();
                appendBubble('Thank you. What\'s your email address? <span class="minor">(For lawyers to contact you only)</span>');
                setInputState(chatInputStates.textSkippable);
            };
            respondFn = function (val) {
                if (val) {
                    userData.basic.email = val;
                    updateLastSession(sessionSenders.self);
                    appendBubble(val);
                }
                setOnGoingState(stateNames.askLawAreas);
            };
            break;
        case stateNames.askLawAreas:
            actionFn = function () {
                alwaysCall();
                appendBubble('Is your incident related to any of the categories below?');
                setInputState(chatInputStates.lock);

                var chatBoxOptions = createChatBoxOptions(lawAreas.map(function (value) {
                    if (value === 'Personal Injuries') {
                        return {val: value}
                    } else {
                        return {
                            val: value,
                            // display: value + ' <span class="minor">(Coming soon)</span>',
                            // disabled: true
                        }
                    }
                }));
                appendElemToLastSession(chatBoxOptions);
            };
            respondFn = function (val) {
                userData.lawArea = val;
                updateLastSession(sessionSenders.self);
                appendBubble(val);
                setOnGoingState(stateNames.askLawSubCate);
            };
            break;
        case stateNames.askLawSubCate:
            actionFn = function () {
                alwaysCall();
                appendBubble('Which of the following applies to your case?');
                var chatBoxOptions = createChatBoxOptions(lawSubCate.map(function (cate) {
                    if (cate === 'Accidents at work') {
                        return {val: cate};
                    } else {
                        return {
                            val: cate,
                            // display: cate + ' <span class="minor">(Coming soon)</span>',
                            // disabled: true
                        }
                    }
                }));
                appendElemToLastSession(chatBoxOptions);
                setInputState(chatInputStates.lock);
            };
            respondFn = function (val) {
                userData.lawSubCate = val;
                updateLastSession(sessionSenders.self);
                appendBubble(val);
                updateLastSession(sessionSenders.oppo);
                appendBubble('Now let\'s get into the details of your incident.');
                setOnGoingState(stateNames.askWhenHappened);
            };
            break;
        case stateNames.askWhenHappened:
            actionFn = function () {
                alwaysCall();
                if (payload && payload.firstShown) {
                    appendBubble(payload.firstShown);
                } else {
                    appendBubble('When did the incident happen?');
                }
                setInputState(chatInputStates.timeRangePicker, {skipText: 'Not sure'});
            };
            respondFn = function (val) {
                updateLastSession(sessionSenders.self);
                if (val) {
                    appendBubble(getFullTimeString(val, true));
                    ongoing.event = {
                        time: val,
                        timeStr: getFullTimeString(val),
                        dateStr: getDateString(val),
                        ts: val.getTime()
                    };
                } else {
                    appendBubble('I am not sure');
                    ongoing.event = {};
                }
                setOnGoingState(stateNames.askWhatHappened);
            };
            break;
        case stateNames.askWhatHappened:
            actionFn = function () {
                alwaysCall();
                appendBubble('Please describe what happened on that day.');
                setInputState(chatInputStates.textUnskippable);
            };
            respondFn = function (val) {
                ongoing.event.desc = val;

                userData.eventSeries = userData.eventSeries || [];
                userData.eventSeries.push(ongoing.event);

                updateLastSession(sessionSenders.self);
                appendBubble(val);
                setOnGoingState(stateNames.askIfMoreEvent);
            };
            break;
        case stateNames.askIfMoreEvent:
            actionFn = function () {
                alwaysCall();
                if (userData.eventSeries[userData.eventSeries.length - 1].time) {
                    appendBubble('Got it. Here is the time line of events we\'ve got so far.');
                    appendEventTimeLine();
                }
                appendBubble('Anything else you want to add to the timeline?');
                var choices = [
                    {
                        val: 1,
                        display: 'Yes'
                    },
                    {
                        val: 2,
                        display: 'No, thanks'
                    }];

                var chatBoxOptions = createChatBoxOptions(choices);
                appendElemToLastSession(chatBoxOptions);
                setInputState(chatInputStates.lock);
            };
            respondFn = function (val) {
                val = String(val);
                if (val === '1') {
                    setOnGoingState(stateNames.askWhenHappened, null, {firstShown: 'When did it happen?'});
                } else if (val === '2') {
                    setOnGoingState(stateNames.checkLegalAnal);
                }
            };
            break;
        case stateNames.checkLegalAnal:
            var supplementQs = [];
            var doNext = function () {
                setOnGoingState(stateNames.askDocuments);
            };
            actionFn = function () {
                alwaysCall();

                if (userData.lawSubCate in lawSubCateSupplements) {
                    var descJoined = (userData.eventSeries || []).map(function (value) {
                        return value.desc
                    }).join(' ');
                    lawSubCateSupplements[userData.lawSubCate].forEach(function (item) {
                        if (!item.fulfillment.test(descJoined)) {
                            supplementQs.push(item);
                        }
                    });
                    if (supplementQs.length) {
                        appendBubble('Thanks. Would you like to answer <strong>' + supplementQs.length + '</strong> question' + (supplementQs.length > 1 ? 's' : '') + ' that ' + (supplementQs.length > 1 ? 'are' : 'is') + ' common to your situation?');

                        var choices = [
                            {
                                val: 1,
                                display: 'Yes'
                            },
                            {
                                val: 2,
                                display: 'No, thanks'
                            }];

                        var chatBoxOptions = createChatBoxOptions(choices);
                        appendElemToLastSession(chatBoxOptions);
                        setInputState(chatInputStates.lock);

                    } else {
                        doNext();
                    }
                } else {
                    doNext();
                }

            };
            respondFn = function (val) {
                val = String(val);
                if (val === '1') {
                    setOnGoingState(stateNames.askYNNSeries, null, {
                        supplements: {
                            content: supplementQs,
                            cursor: 0
                        }
                    });
                } else if (val === '2') {
                    doNext();
                }
            };
            break;
        case stateNames.askQuestion:
            actionFn = function () {
                alwaysCall();
                setInputState(chatInputStates.textSkippable, {skipText: 'I\'ve got no more question'});
            };
            respondFn = function (val) {
                if (val) {
                    userData.questions = userData.questions || [];
                    userData.questions.push(val);
                    updateLastSession(sessionSenders.self);
                    appendBubble(val);
                    setOnGoingState(stateNames.askQuestion, 'Any more question to lawyers?');
                } else {
                    setOnGoingState(stateNames.listSuitableLawyers);
                }
            };
            break;
        case stateNames.listSuitableLawyers:
            var lawFirms;
            actionFn = function () {
                alwaysCall();
                setInputState(chatInputStates.lock);
                appendBubble('Loading law firms data...');
                getLawFirms(function (firms) {
                    lawFirms = firms;
                    appendBubble('The following law firms specialize in ' + userData.lawArea + '.');
                    appendElemToLastSession(createLawFirmViewer(lawFirms, true));
                    appendBubble('Select any of firms from above to generate case material or <span class="silentButton" data-role="' + buttonRoles.doRespond + '" data-val>generate it directly</span>');
                }, userData.lawArea);
            };
            respondFn = function (selected) {
                if (selected) {
                    updateLastSession(sessionSenders.oppo);
                    appendBubble('You have selected <strong>' + selected['name_eng'] + '</strong>.');
                    appendElemToLastSession(createLawFirmViewer([selected], false, true));
                    if (navigator.geolocation) {
                        var mapWrapper = document.createElement('div');
                        mapWrapper.className = 'mapWrapper';
                        appendElemToLastSession(mapWrapper);
                        mapWrapper.appendChild(createBubble('Loading map...'));
                        getUserPosition(function (lat, long) {
                            mapWrapper.innerHTML = '<iframe' +
                                ' width="560"' +
                                ' height="420"' +
                                ' frameborder="0" style="border:0"' +
                                ' src="https://www.google.com/maps/embed/v1/directions?key=AIzaSyAhK2_VHo9gXNgm0VeV8vLGlMYkekoUQ88' +
                                ' &origin=' + lat + ',' + long +
                                ' &destination=' + selected.geocode_lat + ',' + selected.geocode_lng +
                                ' &mode=transit" allowfullscreen>' +
                                ' </iframe>';
                        }, function () {
                            mapWrapper.innerHTML = '';
                            mapWrapper.appendChild(createBubble('Failed to load map'));
                        });
                    }
                }
                setOnGoingState(stateNames.createMaterial, null, {selected: selected})
            };
            break;
        case stateNames.createMaterial:
            var now = new Date();
            userData.selectedFirm = payload.selected;
            userData.requestDate = getDateString(now);
            actionFn = function () {
                appendBubble('Thanks. Now we are generating the documents for you to get ready to meet your lawyer.');
                $.post('/generate_material/', {payload: JSON.stringify(userData)}).then(function (value) {
                    var choices = [
                        {
                            val: 1,
                            display: 'Download material',
                            onclick: function () {
                                downloadLink(value.download);
                            },
                            reusable: true
                        },
                        {
                            val: 3,
                            display: 'Choose another law firm',
                            reusable: false
                        },
                        {
                            val: 2,
                            display: 'Start over',
                            className: 'minor',
                            reusable: false
                        }
                    ];

                    var chatBoxOptions = createChatBoxOptions(choices);
                    appendElemToLastSession(chatBoxOptions);
                    setInputState(chatInputStates.lock);
                });
            };
            respondFn = function (val) {
                if (val === '2') {
                    userData = {
                        basic: userData.basic,
                        geolocation: userData.geolocation,
                        lawArea: null,
                        lawSubCate: null,
                        eventSeries: null,
                        supplements: null,
                        questions: null
                    };
                    $(cursor.lastSession.el).find('[data-role="' + buttonRoles.doRespond + '"]').attr('disabled', true);
                    setOnGoingState(stateNames.askName, [['You started a new case.']]);
                } else if (val === '3') {
                    setOnGoingState(stateNames.listSuitableLawyers);
                }
            };
            break;
        case stateNames.askYNNSeries:
            var ongoingCursor = payload.supplements.cursor;
            var supplement = payload.supplements.content[ongoingCursor];
            var choices = supplement.responses;
            var cls = supplement.cls;
            actionFn = function () {
                alwaysCall();
                appendBubble(supplement.q);

                var chatBoxOptions = createChatBoxOptions(choices);
                appendElemToLastSession(chatBoxOptions);
                setInputState(chatInputStates.lock);
            };
            respondFn = function (val) {
                val = String(val);
                userData.supplements = userData.supplements || {};
                userData.supplements[cls] = userData.supplements[cls] || [];
                userData.supplements[cls].push(choices[val].meaning);
                updateLastSession(sessionSenders.self);
                appendBubble(choices[val].meaning);
                if (++payload.supplements.cursor >= payload.supplements.content.length) {
                    setOnGoingState(stateNames.askDocuments);
                } else {
                    setOnGoingState(stateNames.askYNNSeries, null, payload);
                }
            };
            break;
        case stateNames.askDocuments:
            actionFn = function () {
                alwaysCall();
                appendBubble('Do you have the following documents? (You can tick more than one)');
                appendElemToLastSession(createChatBoxSelectables(documentCheckList.map(function (value, i) {
                    return {
                        val: i,
                        display: value
                    }
                })))
            };
            respondFn = function (val) {
                if (val) {
                    userData.checkedDocuments = val.split(sep).map(function (value) {
                        return parseInt(value)
                    });
                }
                setOnGoingState(stateNames.askQuestion, 'Lastly, what questions do you have for lawyers?');
            };
            break;
        case stateNames.waitForUploading:
            actionFn = function () {
                alwaysCall();
                var choices = [
                    {
                        val: 1,
                        display: 'Upload an image',
                        reusable: true
                    }
                ];

                var chatBoxOptions = createChatBoxOptions(choices);
                appendElemToLastSession(chatBoxOptions);
                setInputState(chatInputStates.lock);
            };
            respondFn = function (val) {
                val = String(val);
                if (val === '1') {
                    openSingleFileUploader(function (elem) {
                        $(cursor.lastSession.el).find('.optionButton').attr('disabled', true);
                        updateLastSession(sessionSenders.self);
                        appendElemToLastSession(elem);
                        updateLastSession(sessionSenders.oppo);
                    }, function (response) {
                        if (response) {
                            response = JSON.parse(response);
                            updateLastSession(sessionSenders.oppo);
                            appendBubble('File uploaded. Now I am ready to answer questions from you :)');
                            cursor.lastImg = response['filename'];
                            setOnGoingState(stateNames.waitForQuestion);
                        }
                    }, function () {
                        updateLastSession(sessionSenders.oppo);
                        appendBubble('Failed to upload and process this image. Use another image instead. Make sure it\'s a static bmp, jp(e)g or png file.');
                        setOnGoingState(stateNames.waitForUploading);
                    })
                }
            };
            break;
        case stateNames.waitForQuestion:
            actionFn = function () {
                alwaysCall();
                setInputState(chatInputStates.textSkippable, {skipText: 'Start a new session'});
            };
            respondFn = function (val) {
                if (val === null) {
                    updateLastSession(sessionSenders.self);
                    appendBubble('I want to start over with another image.');
                    setOnGoingState(stateNames.waitForUploading);

                    if (cursor.lastImg) {
                        $.get('/end_q_session/', {img: cursor.lastImg});
                    }
                } else {
                    updateLastSession(sessionSenders.self);
                    appendBubble(val);
                    setInputState(chatInputStates.lock);
                    updateLastSession(sessionSenders.oppo);
                    appendBubble('Let me think for a moment...');
                    $.get('/get_query/', {q: val, img: cursor.lastImg}).then(onGotAnswer).fail(onerror);

                    function onGotAnswer(response) {
                        if (response.status === 1) {
                            updateLastSession(sessionSenders.oppo);
                            var answerBubble = appendBubble(response['payload'][0][0], function () {
                                setTimeout(function () {
                                    appendBubble('What else do you want to know?');
                                    setOnGoingState(stateNames.waitForQuestion);
                                }, 500);
                            });
                            $(answerBubble).addClass('ans');
                        } else {
                            onerror();
                        }
                    }

                    function onerror() {
                        updateLastSession(sessionSenders.oppo);
                        appendBubble('Couldn\'t get the answer of your question. Could you try it once again?');
                        setOnGoingState(stateNames.waitForQuestion);
                    }
                }
            };
            break;
        default:
            throw new Error('There is no such state called');
    }
    cursor.lastState = new State({actionFn: actionFn, respondFn: respondFn, stateName: stateName});
    cursor.lastState.doAction();
}

function openSingleFileUploader(selectCb, uploadCb, errorCb) {
    var imgBox = document.createElement('div');
    imgBox.className = 'imgContainer';
    var inputElem = document.createElement('input');
    inputElem.type = 'file';
    inputElem.accept = 'image/*';
    inputElem.style.display = 'none';
    document.body.appendChild(inputElem);
    inputElem.onchange = function (ev) {
        if (this.files && this.files.length) {
            handleFile(this.files[0]);
            document.body.removeChild(inputElem);
        }
    };

    function handleFile(file) {
        var img = document.createElement('img');
        img.src = window.URL.createObjectURL(file);
        img.onload = function (ev) {
            window.URL.revokeObjectURL(img.src);
        };
        imgBox.appendChild(img);
        selectCb(imgBox);
        sendFile(file);
    }

    function sendFile(file) {
        var uri = "/upload/";
        var xhr = new XMLHttpRequest();
        var fd = new FormData();

        xhr.open("POST", uri, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    uploadCb(xhr.response);
                } else {
                    errorCb && errorCb();
                }
            }
        };
        fd.append('myFile', file);
        xhr.send(fd);
    }

    inputElem.click();
}

function State(payload) {
    this.stateName = payload.stateName;
    this.doAction = payload.actionFn || function () {
    };
    this.doRespond = payload.respondFn || function () {
    };
}

function createSession(sender) {
    var sessionElem = document.createElement('div');
    sessionElem.className = 'session';
    var sessionHeader = document.createElement('div');
    sessionHeader.className = 'sessionHeader';

    if (sender === sessionSenders.self) {
        sessionElem.classList.add('self');
        sessionHeader.innerText = 'Me';
    } else if (sender === sessionSenders.oppo) {
        sessionElem.classList.add('oppo');
        sessionHeader.innerText = 'AnswerBot';
    }

    sessionElem.appendChild(sessionHeader);
    return sessionElem;
}

function createBubble(paragraphs) {
    paragraphs = [].concat(paragraphs);
    var bubbleElem = document.createElement('div'), bubbleContentElem = document.createElement('div'), tmpElem;
    bubbleElem.className = 'bubble';
    bubbleContentElem.className = 'bubbleContent';
    paragraphs.forEach(function (value) {
        tmpElem = document.createElement('div');
        tmpElem.innerHTML = value;
        bubbleContentElem.appendChild(tmpElem);
    });
    bubbleElem.appendChild(bubbleContentElem);
    return bubbleElem;
}

function createChatBoxOptions(options, reusable) {
    var optionsElem = document.createElement('div'), optionElem;
    optionsElem.className = 'options';
    options.forEach(function (option) {
        optionElem = document.createElement('button');
        optionElem.className = 'optionButton';
        optionElem.dataset.role = buttonRoles.doRespond;
        optionElem.innerHTML = option.display || option.val;
        optionElem.dataset.val = option.val;
        optionElem.dataset.reusable = reusable || '';
        if (option.disabled) {
            optionElem.disabled = true;
        }
        if (option.className) {
            $(optionElem).addClass(option.className);
        }
        if (option.reusable) {
            optionElem.dataset.reusable = 'true';
        }
        if (option.onclick) {
            optionElem.addEventListener('click', function () {
                option.onclick();
            });
        }


        optionsElem.appendChild(optionElem);
    });
    return optionsElem;
}

function appendEventTimeLine() {
    var elem = document.createElement('div');
    elem.className = 'timeLineWrapper';
    appendElemToLastSession(elem);
    drawTimeline(elem, userData.eventSeries.filter(function (event) {
        return event.time;
    }), true, true, elem.clientWidth * 0.9);
}

function createChatBoxSelectables(options) {
    var optionsEl = document.createElement('div');
    var selectablesEl = document.createElement('div'), selectableEl, inputElem;
    var confirmButton = document.createElement('button');
    var selected;

    confirmButton.className = 'optionButton';
    confirmButton.innerText = 'Done';
    optionsEl.className = 'options';
    selectablesEl.className = 'selectables';
    options.forEach(function (option) {
        selectableEl = document.createElement('label');
        selectableEl.className = 'selectable';
        inputElem = document.createElement('input');
        inputElem.type = 'checkbox';
        inputElem.dataset.val = option.val;

        inputElem.addEventListener('change', function () {
            updateConfirmButton();
        });

        selectableEl.appendChild(inputElem);
        selectableEl.appendChild(new Text(option.display || option.val));
        selectablesEl.appendChild(selectableEl);
    });
    optionsEl.appendChild(selectablesEl);
    optionsEl.appendChild(confirmButton);
    updateConfirmButton();

    confirmButton.addEventListener('click', function () {
        $(selectablesEl).children().attr('disabled', true).find('input').remove();
        $(confirmButton).attr('disabled', true);
        cursor.lastState && cursor.lastState.doRespond((this.dataset.selected || ''));
    });

    function updateConfirmButton() {
        selected = [];
        $(selectablesEl).find('input[type="checkbox"]').each(function () {
            if (this.checked) {
                selected.push(this.dataset.val);
                $(this).closest('.selectable').addClass('selected');
            } else {
                $(this).closest('.selectable').removeClass('selected');
            }
        });
        confirmButton.dataset.selected = selected.join(sep);
    }

    return optionsEl;
}

function updateLastSession(sender) {
    var el;
    if (!cursor.lastSession || cursor.lastSession.sender !== sender) {
        el = createSession(sender);
        sessionsContainer.appendChild(el);
        cursor.lastSession = {
            sender: sender,
            el: el
        }
    }
}

function downloadLink(link) {
    var a = document.createElement('a')
    a.href = link;
    a.download = 'download';
    a.style.position = 'absolute';
    a.style.top = '-999px';
    a.style.left = '-999px';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function createLawFirmViewer(firms, selectable, readonly) {
    var currentSortBy = 'default';
    var container = document.createElement('div');
    var ul = document.createElement('ul');
    var lawList = document.createElement('div');

    lawList.className = 'lawList showFreeOnly';

    if (selectable) {
        lawList.classList.add('selectableList');
    }

    container.className = 'lawListContainer';
    if (!readonly) {
        var headerElem = document.createElement('header');
        headerElem.className = 'containerHeader';

        var ctrlContainer = document.createElement('div');
        ctrlContainer.className = 'ctrl';

        var ctrlItem = document.createElement('label');
        ctrlItem.className = 'ctrlItem checkbox';

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;

        checkbox.addEventListener('change', function () {
            if (checkbox.checked) {
                lawList.classList.add('showFreeOnly');
            } else {
                lawList.classList.remove('showFreeOnly');
            }
        });

        ctrlItem.appendChild(checkbox);
        ctrlItem.appendChild(new Text(('Free Only')));

        ctrlContainer.appendChild(ctrlItem);

        ctrlItem = document.createElement('div');
        ctrlItem.className = 'ctrlItem options';
        ctrlItem.innerHTML = '<span class="remark">Sort by</span>';
        ctrlItem.innerHTML += '<div class="optionGroup normal">' +
            '<span class="option active" data-by="default">Name</span>' +
            '<span class="option" data-by="firmSize">Size</span>' +
            (navigator.geolocation ? '<span class="option" data-by="distance">Nearest</span>' : '')
            + '</div>';

        $(ctrlItem).on('click', '.option', function () {
            var _this = this;
            var sortBy = this.dataset.by;
            currentSortBy = sortBy;

            if (sortBy === 'default') {
                $(ul.children).sort(function (a, b) {
                    if (a.defaultOrder < b.defaultOrder) {
                        return -1;
                    }
                    if (a.defaultOrder > b.defaultOrder) {
                        return 1;
                    }
                    return 0;
                }).detach().appendTo(ul);
                onSortDone();
            } else if (sortBy === 'firmSize') {
                $(ul.children).sort(function (a, b) {
                    if (a.firmSize > b.firmSize) {
                        return -1;
                    }
                    if (a.firmSize < b.firmSize) {
                        return 1;
                    }
                    if (a.defaultOrder < b.defaultOrder) {
                        return -1;
                    }
                    if (a.defaultOrder > b.defaultOrder) {
                        return 1;
                    }
                    return 0;
                }).detach().appendTo(ul);
                onSortDone();
            } else if (sortBy === 'distance') {
                if (userData.geolocation) {
                    onGotPosition(userData.geolocation.latitude, userData.geolocation.longitude);
                } else {
                    navigator.geolocation.getCurrentPosition(function (position) {
                        var lat = position.coords.latitude, long = position.coords.longitude;
                        userData.geolocation = {
                            latitude: lat,
                            longitude: long
                        };
                        if (currentSortBy === sortBy) {
                            onGotPosition(lat, long);
                        }
                    });
                }

                function onGotPosition(lat, long) {
                    $(ul.children).sort(function (a, b) {
                        var distanceToA = getDistanceFromLatLonInKm(lat, long, a.latitude, a.longitude);
                        var distanceToB = getDistanceFromLatLonInKm(lat, long, b.latitude, b.longitude);
                        if (distanceToA < distanceToB) {
                            return -1;
                        }
                        if (distanceToA > distanceToB) {
                            return 1;
                        }
                        if (a.defaultOrder < b.defaultOrder) {
                            return -1;
                        }
                        if (a.defaultOrder > b.defaultOrder) {
                            return 1;
                        }
                        return 0;
                    }).detach().appendTo(ul);
                    onSortDone();
                }
            }

            function onSortDone() {
                $(_this).addClass('active').siblings('.option').removeClass('active');
                $(lawList).animate({
                    scrollTop: 0
                })
            }
        });

        ctrlContainer.appendChild(ctrlItem);

        headerElem.appendChild(ctrlContainer);
        container.appendChild(headerElem);
    }

    firms.forEach(function (firm, i) {
        var built = buildListItem(firm, selectable);
        built.defaultOrder = i;
        ul.appendChild(built);
    });

    lawList.appendChild(ul);

    container.appendChild(lawList);

    function buildListItem(firm, selectable) {
        var li = document.createElement('li');
        var header = document.createElement('div');
        header.className = 'header';
        var title;
        if (firm['website'] && (firm['website'] = firm['website'].trim())) {
            title = document.createElement('a');
            title.href = '/redirect?url=' + firm['website'].trim();
            title.title = 'Visit the website of this firm';
            title.target = '_blank';
            title.className = 'title';
            title.innerHTML = '<div>' + firm['name_eng'] + '</div>' +
                '<div>' + firm['name_chi'] + '</div>';
        } else {
            title = document.createElement('div');
            title.className = 'title';
            title.innerHTML = '<div>' + firm['name_eng'] + '</div>' +
                '<div>' + firm['name_chi'] + '</div>';
        }
        var featured = document.createElement('div');
        var firmSize = parseInt(firm['Total']);

        li.firmSize = firmSize;

        featured.className = 'featured';
        featured.innerHTML = '<div class="lawyers"><i class="fa fa-users"></i> <strong>' + firmSize + '</strong> lawyers</div>';
        if (firm['free_consult']) {
            featured.innerHTML += '<div class="freeCons"><i class="fa fa-check"></i> <strong>45-min free</strong></div>';
            li.classList.add('hasFreeConsult');
        }

        if (selectable) {
            li.classList.add('isSelectable');
            var selectButton = document.createElement('span');
            selectButton.className = 'selectButton';
            selectButton.innerHTML = '<i class="fa fa-check-circle"></i>';

            selectButton.addEventListener('click', function (e) {
                $(li).addClass('selected').attr('disabled', true).siblings().removeClass('selected').find('.selectButton').remove();
                sendResponse(firm);
            });

            header.appendChild(selectButton);
        }

        header.appendChild(title);
        header.appendChild(featured);

        li.appendChild(header);

        var reachMethods = document.createElement('div');
        reachMethods.className = 'reachMethods';

        var contactMethods = document.createElement('div');
        contactMethods.className = 'contactMethods';
        if (firm['tel_no']) {
            contactMethods.innerHTML += '<div><i class="fa fa-phone"></i> ' + firm['tel_no'] + '</div>';
        }
        if (firm['fax_no']) {
            contactMethods.innerHTML += '<div><i class="fa fa-fax"></i> ' + firm['fax_no'] + '</div>';
        }
        if (firm['email'] && (firm['email'] = String(firm['email']).trim())) {
            contactMethods.innerHTML += '<div><i class="fa fa-envelope"></i> ' + firm['email'] + '</div>';
        }

        reachMethods.appendChild(contactMethods);

        var address = document.createElement('div');
        address.className = 'address';
        address.innerHTML = '<i class="fa fa-map-marker"></i> ' + firm['address_eng'] + ' (' + firm['address_chi'] + ')';

        reachMethods.appendChild(address);

        li.appendChild(reachMethods);

        var consultAreaNo = firm['consult_area_no'];
        if (consultAreaNo) {
            var areasElem = document.createElement('div');
            areasElem.className = 'areas';

            consultAreaNo.forEach(function (value) {
                var span = document.createElement('span');
                span.className = 'area';
                span.innerText = lawAreasFull[parseInt(value) - 1];
                areasElem.appendChild(span);
            });

            li.appendChild(areasElem);
            var span = document.createElement('span');
            span.className = 'clickable silent';
            span.innerHTML = 'Show specialized areas >';
            span.addEventListener('click', function () {
                if ($(li).hasClass('showAreas')) {
                    $(li).removeClass('showAreas');
                    span.innerHTML = 'Show specialized areas >';
                } else {
                    $(li).addClass('showAreas');
                    span.innerHTML = '< Hide';
                }
            });
            li.appendChild(span);
        }
        li.latitude = firm['geocode_lat'];
        li.longitude = firm['geocode_lng'];
        return li;
    }

    return container;
}

function appendBubble(paragraphs, cb) {
    paragraphs = [].concat(paragraphs);
    return appendElemToLastSession(createBubble(paragraphs), cb);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function getUserPosition(cb, failCb) {
    if (userData.geolocation) {
        cb(userData.geolocation.latitude, userData.geolocation.longitude);
    } else {
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat = position.coords.latitude, long = position.coords.longitude;
            userData.geolocation = {
                latitude: lat,
                longitude: long
            };
            cb(lat, long);
        }, failCb);
    }
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function appendElemToLastSession(elem, cb) {
    var sessionElem = cursor.lastSession.el;
    sessionElem.appendChild(elem);
    // chatBoxElem.scrollTop = chatBoxElem.scrollHeight;
    $(chatBoxElem).animate({scrollTop: chatBoxElem.scrollHeight}, {
        complete: cb || function () {
        }
    });
    return elem;
}

function getLawFirms(cb, area) {
    $.get('/get_law_firms/', {area: lawAreasToNb[area]}).then(function (value) {
        cb(value)
    });
}

function responsive() {
    if (window.innerWidth >= 760) {
        $(chatContainer).css('max-height', window.innerHeight - $(navigation).outerHeight() - 45);
    } else {
        $(chatContainer).css('max-height', 'unset');
    }
}

responsive();

window.addEventListener('resize', function (ev) {
    responsive();
});

$(document).on('click', selectors.dataRole, function () {
    var role = this.dataset.role;
    var val = this.dataset.val;
    var cared = this;
    if (!cared.dataset.reusable &&
        ($(cared).closest($(sessionsContainer)).length || ((cared = cared.friend) && $(cared).closest($(sessionsContainer)).length))) {
        $(cared).attr('disabled', true).addClass('selected').siblings(selectors.dataRole).attr('disabled', true);
    }
    switch (role) {
        case buttonRoles.doRespond:
            cursor.lastState && cursor.lastState.doRespond(val);
            break;
        default:
            break;
    }
});

setOnGoingState(stateNames.waitForUploading, 'Welcome. To continue, click the button below to upload an image.');
// })();