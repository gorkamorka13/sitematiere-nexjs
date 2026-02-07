<!--
  Rui Santos
  Complete project details at https://RandomNerdTutorials.com
  
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files.
  
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

-->


<!DOCTYPE html>
<html>

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" type="text/css" href="w3.css">
  <script src="highcharts.js"></script>
  <script src="highcharts-more.js"></script>
  <!-- <script src="https://code.highcharts.com/modules/exporting.js"></script> -->
  <!-- <script src="https://code.highcharts.com/modules/export-data.js"></script> -->
  <!-- <script src="https://code.highcharts.com/modules/accessibility.js"></script> -->
  <script src="jquery-3.4.1.min.js"></script>
  <link rel="stylesheet" type="text/css" href="style.css">

</head>

<?php
include 'bdd.php';
?>

<body>
  <h2>ESP32 Weather Station</h2>
  <div class=" w3-container w3-cell w3-mobile">
    <div id="gaugetemperature" style="height: 250px"></div>
  </div>
  <div class="w3-container w3-cell w3-mobile">
    <div id="gaugehygrometrie" style="height: 250px"></div>
  </div>
  <div class="w3-container w3-cell w3-mobiles">
    <div id="gaugeluminosite" style="height: 250px"></div>
  </div>
  <br>
  <div class="w3-container w3-cell-row w3-card">
    <div class="w3-container w3-cell">
      <h1 class="w3-padding">Time capteur</h1>
      <select id="time_capteur" class="w3-select" style="width:80%;">
        <option value="1000"> 1 seconde</option>
        <option value="2000"> 2 secondes</option>
        <option value="5000"> 5 secondes</option>
        <option value="10000"> 10 secondes</option>
      </select>
      <br>
    </div>
    <div class="w3-container  w3-card w3-cell">
      <h1 class="w3-padding">Time temperature</h1>
      <select id="time_temperature" class="w3-select" style="width:80%;">
        <option value="1"> 1 </option>
        <option value="2"> 2 </option>
        <option value="5"> 5 </option>
        <option value="10"> 10 </option>
        <option value="30"> 30 </option>
      </select>
      <br>
    </div>
    <div class="w3-container w3-card w3-cell">
      <h1 class="w3-padding">Time hygrometrie</h1>
      <select id="time_hygrometrie" class="w3-select" style="width:80%;">
        <option value="1"> 1 moyenne</option>
        <option value="2"> 2 moyenne</option>
        <option value="5"> 5 secondes</option>
        <option value="10"> 10 secondes</option>
      </select>
    </div>
    <div class="w3-container w3-card  w3-margin w3-cell">
      <h1 class="w3-padding">Time luminosite</h1>
      <select id="time_luminosite" class="w3-select" style="width:80%;">
        <option value="1"> 1 moyenne</option>
        <option value="2"> 2 moyenne</option>
        <option value="5"> 5 secondes</option>
        <option value="10"> 10 secondes</option>
      </select>
    </div>
  </div>
  <br>
  <button id="appliquer" class="w3-button w3-white w3-border w3-ripple">Appliquer</button>
  <div id="chart-temperature" class="container"></div>
  <div id="chart-humidity" class="container"></div>
  <div id="chart-luminosite" class="container"></div>



</body>

<script>
  var value1 = <?php echo $value1; ?>;
  var value2 = <?php echo $value2; ?>;
  var value3 = <?php echo $value3; ?>;
  var reading_time = <?php echo $reading_time; ?>;
</script>
<script src="script.js"></script>

</html>