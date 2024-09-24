let cord = false;
let geolocation = false;

function changeForm() {
    if (document.getElementById("method").value == "By Cords") {
        document.getElementById("info").innerHTML = `
    
      <input type="number" id="p1" step="0.00000001">
      <input type="number" id="p2" step="0.00000001">
      <p>Or together (no spaces):</p>
      <input type="text" id="ps">

      <input type="submit">
      <input type="reset">
    `;
        cord = true;
        geolocation = false;
        return;
    }
    if (document.getElementById("method").value == "By State") {
        document.getElementById("info").innerHTML = `
    
      <input type="text" id="state" maxlength="2">

      <input type="submit">
      <input type="reset">
    `;
        cord = false;
        geolocation = false;
        return;
    }
    document.getElementById("info").innerHTML = `
      <p>Press submit to use your current location</p>
      <input type="submit">
      <input type="reset">
    `;
    geolocation = true;
}

function noaa(url, usekey) {
    var key = undefined;
    if (usekey == true) {
        return httpGet(url, key);
    }
    return httpGet(url, null);
}

//stole this code lmao

function httpGet(url, key) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    if (key != null) {
        xmlHttp.setRequestHeader("token", key);
    }
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

//end of stolen code lol

function pointWarns(la, lo) {
    let points =
        Math.round(la * 10000000) / 10000000 +
        "," +
        Math.round(lo * 10000000) / 10000000;
    let json = JSON.parse(
        noaa("https://api.weather.gov/points/" + points, false)
    );

    let warnings = JSON.parse(
        noaa(
            "https://api.weather.gov/alerts/active?area=" +
                JSON.parse(
                    noaa("https://api.weather.gov/points/" + points, false)
                ).properties.relativeLocation.properties.state
        )
    ).features;
    if (json.status == "404") {
        return null;
    }
    let newArray = [];
    for (let warning of warnings) {
        for (let zones of warning.properties.affectedZones) {
            if (
                zones.includes(json.properties.county) ||
                zones.includes(json.properties.fireWeatherZone)
            ) {
                newArray.push(warning);
            }
        }
    }

    return newArray;
}

function stateWarns(state) {
    let json = JSON.parse(
        noaa("https://api.weather.gov/alerts/active?area=" + state, false)
    );
    if (json.status == "400") {
        return null;
    }
    if (json.features.length == 0) {
        return [];
    }
    return json.features;
}

document.getElementById("info").onsubmit = () => {
    if (cord) {
        if (
            document.getElementById("p1").value.length == 0 ||
            document.getElementById("p2").value.length == 0
        ) {
            try {
                updateText(
                    pointWarns(
                        parseFloat(
                            document.getElementById("ps").value.split(",")[0]
                        ),
                        parseFloat(
                            document.getElementById("ps").value.split(",")[1]
                        )
                    ).length,
                    pointWarns(
                        parseFloat(
                            document.getElementById("ps").value.split(",")[0]
                        ),
                        parseFloat(
                            document.getElementById("ps").value.split(",")[1]
                        )
                    ),
                    JSON.parse(
                        noaa(
                            "https://api.weather.gov/points/" +
                                document.getElementById("ps").value,
                            false
                        )
                    ).properties.relativeLocation.properties.state,
                    document.getElementById("ps").value
                );
            } catch (e) {
                alert(
                    "Something went wrong, most likely the points you entered are not in the US or are not real cords."
                );
                console.log(e);
            }
            return;
        }
        try {
            updateText(
                pointWarns(
                    document.getElementById("p1").value,
                    document.getElementById("p2").value
                ).length,
                pointWarns(
                    document.getElementById("p1").value,
                    document.getElementById("p2").value
                ),
                JSON.parse(
                    noaa(
                        "https://api.weather.gov/points/" +
                            document.getElementById("p1").value +
                            "," +
                            document.getElementById("p2").value,
                        false
                    )
                ).properties.relativeLocation.properties.state,
                document.getElementById("p1").value +
                    "," +
                    document.getElementById("p2").value
            );
        } catch (e) {
            alert(
                "Something went wrong, most likely the points you entered are not in the US or are not real cords."
            );
            console.log(e);
        }
        return;
    }
    if (geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            try {
                updateText(
                    pointWarns(
                        position.coords.latitude,
                        position.coords.longitude
                    ).length,
                    pointWarns(
                        position.coords.latitude,
                        position.coords.longitude
                    ),
                    JSON.parse(
                        noaa(
                            "https://api.weather.gov/points/" +
                                position.coords.latitude +
                                "," +
                                position.coords.longitude,
                            false
                        )
                    ).properties.relativeLocation.properties.state,
                    position.coords.latitude + "," + position.coords.longitude
                );
            } catch (e) {
                alert(
                    "Something went wrong, you may not be in the US, you may not have geolocation enabled, your browser may not support geolocation, etc."
                );
                console.log(e);
            }
        });
        return;
    }
    try {
        updateText(
            stateWarns(document.getElementById("state").value.toUpperCase())
                .length,
            stateWarns(document.getElementById("state").value.toUpperCase()),
            document.getElementById("state").value.toUpperCase(),
            undefined
        );
    } catch (e) {
        alert(
            'Something went wrong, most likely the "state code" you entered is not a correct state code in the US.'
        );
        console.log(e);
    }
};

function updateText(warns, warnlist, state, points) {
    if (warns != 0 || warnlist == []) {
        let text = "In the state of " + state;
        if (points != undefined) {
            text += ", on the cords of " + points + ", there ";
        } else {
            text = text + ", there ";
        }
        text =
            warns > 1
                ? text +
                  "are " +
                  warns +
                  " weather alerts. The list will be shown below."
                : text +
                  " is 1 weather alerts. The weather alerts will be shown below.";
        document.getElementById("header").innerText = text;
        let totalhtml = ``;
        for (let warn of warnlist) {
            let level = "";
            if (warn.properties.event.includes("Warning")) {
                level = "w";
            } else if (warn.properties.event.includes("Watch")) {
                level = "h";
            } else if (warn.properties.event.includes("Advisory")) {
                level = "a";
            } else if (
                warn.properties.event.includes("Statement") ||
                warn.properties.event.includes("Outlook")
            ) {
                level = "s";
            } else if (warn.properties.event.includes("Alert")) {
                level = "t";
            } else if (warn.properties.event.includes("Test Message")) {
                level = "tm";
            } else if (warn.properties.event.includes("Child Abduction Emergency") {
                level = "am"
            } else {
                level = "";
            }
            let disbefore = warn.properties.description;
            let splitdis = disbefore.split("*");
            let dis = "";
            for (let i = 0; i < splitdis.length; i++) {
                dis = dis + "*" + splitdis[i] + "<br><br>";
            }
            totalhtml =
                totalhtml +
                `
              <div class="item ` +
                level +
                `">
                <h3> ` +
                warn.properties.event +
                `</h3>
                <p>
                  ` +
                warn.properties.headline +
                ". " +
                warn.properties.instruction +
                `
                </p>
                <details>
                    <summary>More Info</summary>
                    <p>` +
                dis +
                `</p>
                <br>
                <br>
                <br>
                <br>
                <br>
                <p>
                  The ` +
                warn.properties.event +
                ` was issued on ` +
                new Date(warn.properties.sent) +
                ` by ` +
                warn.properties.senderName +
                ` (` +
                warn.properties.sender +
                `) . It is effective on ` +
                new Date(warn.properties.effective) +
                ` and has a severity level of "` +
                warn.properties.severity +
                `". It's status is "` +
                warn.properties.status +
                `" and an urgency level of "` +
                warn.properties.urgency +
                `". It expires on ` +
                new Date(warn.properties.expires) +
                ` and ` +
                (warn.properties.ends == null
                    ? "does not have a end time"
                    : "ends on " + new Date(warn.properties.ends)) +
                `.
                </p>
                </details>
              </div>
              `;
        }
        document.getElementById("list").innerHTML = totalhtml;
        return;
    }
    let text = "In the state of " + state;
    if (points != undefined) {
        text +=
            ", on the cords of " + points + ", there are no weather alerts.";
    } else {
        text = text + ", there are no weather alerts.";
    }
    document.getElementById("header").innerText = text;
    document.getElementById("list").innerHTML = "";
}
