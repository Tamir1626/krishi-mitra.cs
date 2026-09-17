// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBlHh_EuUE_OeDx91qSpT5amC_soHpmMFw",
  authDomain: "krishimitra01-923cb.firebaseapp.com",
  databaseURL: "https://krishimitra01-923cb-default-rtdb.firebaseio.com",
  projectId: "krishimitra01-923cb",
  storageBucket: "krishimitra01-923cb.firebasestorage.app",
  messagingSenderId: "282806875059",
  appId: "1:282806875059:web:20b9e7a151e74f763b51c6"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Chart.js gauge
const ctx = document.getElementById('gauge').getContext('2d');
const gauge = new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ['Moisture', 'Dry'],
    datasets: [{ data: [0, 100], backgroundColor: ['#00c853', '#ddd'] }]
  },
  options: {
    rotation: -90,
    circumference: 180,
    cutout: '70%',
    plugins: { legend: { display: false } }
  }
});

// Auth check
auth.onAuthStateChanged(user => {
  if (!user) { 
    window.location = 'login.html'; 
    return; 
  }
  const uid = user.uid;

  // Profile
  db.ref(`users/${uid}/profile`).once('value').then(s => {
    const p = s.val();
    document.getElementById('userName').innerText = p ? (p.name || p.email) : user.email;
  });

  // Crop Sidebar
  db.ref(`users/${uid}/Crops`).once('value').then(snapshot => {
    const crops = snapshot.val() || {};
    const cropList = document.getElementById('cropList');
    cropList.innerHTML = '';
    Object.keys(crops).forEach(c => {
      const div = document.createElement('div');
      div.className = 'crop';
      div.innerText = c;
      div.onclick = () => selectCrop(uid, c, crops[c], div); // pass div
      cropList.appendChild(div);
    });

    // Apply previously selected crop highlight
    db.ref(`users/${uid}/SelectedCrop`).once('value').then(s => {
      if (s.exists()) {
        highlightCrop(s.val());
      }
    });
  });

  // SoilMoisture live update
  db.ref(`users/${uid}/SoilMoisture`).on('value', snap => {
    const v = snap.val() || 0;
    document.getElementById('moistureText').innerText = 'Soil Moisture: ' + v + '%';
    gauge.data.datasets[0].data = [v, 100 - v];
    gauge.update();
  });

  // Controls
  db.ref(`users/${uid}/Controls/Mode`).on('value', s => {
    document.getElementById('modeText').innerText = s.val() || 'Manual';
  });

  db.ref(`users/${uid}/Controls/Pump`).on('value', s => {
    document.getElementById('pumpStatus').innerText = s.val() || 'OFF';
  });

  // Threshold
  db.ref(`users/${uid}/Threshold`).on('value', s => {
    const t = s.val() || {};
    document.getElementById('lower').value = t.Lower || 30;
    document.getElementById('upper').value = t.Upper || 70;
  });

  // Buttons
  document.getElementById('setAuto').onclick = () => db.ref(`users/${uid}/Controls/Mode`).set('Auto');
  document.getElementById('setManual').onclick = () => db.ref(`users/${uid}/Controls/Mode`).set('Manual');
  document.getElementById('pumpOn').onclick = () => db.ref(`users/${uid}/Controls/Pump`).set('ON');
  document.getElementById('pumpOff').onclick = () => db.ref(`users/${uid}/Controls/Pump`).set('OFF');

  document.getElementById('saveThreshold').onclick = () => {
    const lower = parseInt(document.getElementById('lower').value);
    const upper = parseInt(document.getElementById('upper').value);
    db.ref(`users/${uid}/Threshold`).set({ Lower: lower, Upper: upper });
    alert('Threshold saved');
  };

  document.getElementById('saveSchedule').addEventListener('click', () => {
    const modeRef = firebase.database().ref('users/' + uid + '/Controls/Mode');

    modeRef.once('value').then(snapshot => {
      const currentMode = snapshot.val();
      
      if (currentMode === 'Manual') {
        const startTime = document.getElementById('startTime').value;
        const durationMin = parseInt(document.getElementById('durationMin').value) || 0;
        const durationSec = parseInt(document.getElementById('durationSec').value) || 0;
        const totalSeconds = durationMin * 60 + durationSec;

        if (startTime && totalSeconds > 0) {
          db.ref(`users/${uid}/Schedule`).set({ startTime, totalSeconds });
          alert("Schedule saved: " + startTime + " for " + totalSeconds + " seconds");
        } else {
          alert('Please enter a valid start time and a duration.');
        }
      } else {
        alert('Scheduling irrigation is only available in Manual mode.');
      }
    }).catch(error => {
      console.error("Error reading system mode: ", error);
      alert('Could not check system mode. Please try again.');
    });
  });

  // Logout
  document.getElementById('logoutBtn').onclick = () => auth.signOut().then(() => window.location = 'login.html');

  // Keep crop highlight synced with Firebase
  db.ref(`users/${uid}/SelectedCrop`).on('value', s => {
    if (s.exists()) {
      highlightCrop(s.val());
      document.getElementById('selectedCrop').innerText = s.val();
    }
  });
});

// Crop select function with highlight
function selectCrop(uid, cropName, cropObj, div) {
  db.ref('users/' + uid + '/SelectedCrop').set(cropName);
  db.ref('users/' + uid + '/Threshold').set({ Lower: cropObj.Lower, Upper: cropObj.Upper });
  document.getElementById('selectedCrop').innerText = cropName;
  highlightCrop(cropName);
}

// Helper: highlight selected crop
function highlightCrop(selected) {
  document.querySelectorAll('.crop').forEach(div => {
    if (div.innerText === selected) {
      div.classList.add('selected');
    } else {
      div.classList.remove('selected');
    }
  });
}
