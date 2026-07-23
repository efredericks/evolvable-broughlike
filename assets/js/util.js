// helper to get a random item from an array
function getRandomArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// fisher-yates shuffle
function shuffle(arr){
    let temp, r;
    for (let i = 1; i < arr.length; i++) {
        r = randomRange(0,i);
        temp = arr[i];
        arr[i] = arr[r];
        arr[r] = temp;
    }
    return arr;
}


// random integer in range
function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// try function to place things in open spaces
function tryTo(desc, cb) {
    for (let timeout = 1000; timeout >= 0; timeout--) {
        if (cb()) return;
    }
    throw `Timeout trying to: ${desc}`;
}

// text padding
function rightPad(textArray){
    let finalText = "";
    textArray.forEach(text => {
        text+="";
        for(let i=text.length;i<10;i++){
            text+=" ";
        }
        finalText += text;
    });
    return finalText;
}