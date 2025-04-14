#include <LiquidCrystal_I2C.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP8266WebServer.h>

WiFiClient client;
HTTPClient http;
ESP8266WebServer server(80);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// WiFi credentials
const char* ssid = "hello";
const char* password = "12345677";

// Pin Definitions
#define DHTPIN D4
#define DHTTYPE DHT11
#define SOIL_MOISTURE_PIN A0
#define PIR_PIN D5
#define RELAY_PIN_1 D3
#define PUSH_BUTTON_1 D7
#define PUMP_BUTTON_PIN D2

DHT dht(DHTPIN, DHTTYPE);

const String SERVER_URL = "http://192.168.41.215:3000/api/getData";

// Timers
unsigned long previousSendMillis = 0;
unsigned long previousCheckMillis = 0;
const long sendInterval = 10000;
const long checkInterval = 3000;

// Global Variables
float temperature = 0.0;
float humidity = 0.0;
int soilMoisture = 0;
int pirStatus = 0;
bool dataEnabled = true;
bool lastButtonState = HIGH;
bool lastPumpState = HIGH;
// bool pump_on = false;
bool pumpStatus;

bool isPumpOn() {
  return digitalRead(RELAY_PIN_1) == HIGH;  
}

void setup() {
  Serial.begin(115200);

  pinMode(PIR_PIN, INPUT);
  pinMode(RELAY_PIN_1, OUTPUT);
  pinMode(PUSH_BUTTON_1, INPUT_PULLUP);
  pinMode(PUMP_BUTTON_PIN, INPUT_PULLUP);

  digitalWrite(RELAY_PIN_1, LOW); 
  // pump_on = false;
  // pumpStatus = false;

  lastPumpState = digitalRead(PUMP_BUTTON_PIN);
  lastButtonState = digitalRead(PUSH_BUTTON_1);

  dht.begin();

  server.on("/refresh", HTTP_GET, handleRefresh);
  server.on("/toggle", HTTP_GET, handleToggle);
  server.on("/pump", HTTP_GET, handlePump);

  setup_wifi();
  server.begin();
  Serial.println("HTTP server started");
}

void setup_wifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void handleRefresh() {
  if (!dataEnabled) {
    server.send(200, "application/json", "{\"status\":\"disabled\", \"message\":\"Data transmission is currently disabled\"}");
    return;
  }

  readSensorData();
  bool success = sendDataToServer();

  StaticJsonDocument<200> response;
  response["status"] = success ? "success" : "error";
  response["message"] = success ? "Data refreshed and sent" : "Failed to send data";
  response["pump_on"] = isPumpOn();

  String res;
  serializeJson(response, res);
  server.send(success ? 200 : 500, "application/json", res);
}

void handleToggle() {
  dataEnabled = !dataEnabled;

  readSensorData();

  StaticJsonDocument<200> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soil_moisture"] = soilMoisture;
  doc["pir"] = pirStatus;
  doc["dataEnabled"] = dataEnabled;
  doc["pump_on"] = isPumpOn();

  String payload;
  serializeJson(doc, payload);

  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(payload);

  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    Serial.println("Server response: " + response);
  } else {
    Serial.printf("HTTP POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();

  // digitalWrite(RELAY_PIN_1, isPumpOn() ? LOW : HIGH);

  server.send(200, "application/json",
    String("{\"status\":\"success\", \"dataEnabled\":") + (dataEnabled ? "true" : "false") +
    ", \"pump_on\":" + (isPumpOn() ? "true" : "false") + "}");
}


void handlePump() {
  bool a =digitalRead(RELAY_PIN_1);

  digitalWrite(RELAY_PIN_1,!a);
  Serial.println(!a ? "Pump Enabled From Website" : "Pump Disabled From Website");

  readSensorData();

  StaticJsonDocument<200> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soil_moisture"] = soilMoisture;
  doc["pir"] = pirStatus;
  doc["dataEnabled"] = dataEnabled;
  doc["pump_on"] = isPumpOn();

  String payload;
  serializeJson(doc, payload);

  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(payload);

  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    Serial.println("Server response: " + response);
  } else {
    Serial.printf("HTTP POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();

  // digitalWrite(RELAY_PIN_1, isPumpOn() ? LOW : HIGH);

  server.send(200, "application/json",
    String("{\"status\":\"success\", \"dataEnabled\":") + (dataEnabled ? "true" : "false") +
    ", \"pump_on\":" + (isPumpOn() ? "true" : "false") + "}");
}



void checkPhysicalButton() {
  bool buttonState = digitalRead(PUSH_BUTTON_1);

  if (buttonState == LOW && lastButtonState == HIGH) {
    delay(50);
    dataEnabled = !dataEnabled;

    Serial.println(dataEnabled ? "Button pressed - Data transmission ENABLED" :
                                 "Button pressed - Data transmission DISABLED");

    readSensorData();
    sendDataToServer();
  }
  lastButtonState = buttonState;
}

void checkPumpButton() {
  bool buttonState = digitalRead(PUMP_BUTTON_PIN);

  if (buttonState == LOW && lastPumpState == HIGH) {
    delay(50);
    
    bool a = digitalRead(RELAY_PIN_1);
    digitalWrite(RELAY_PIN_1,!a);

    
    Serial.println(digitalRead(RELAY_PIN_1) ? "Pump ENABLED (Manual)" : "Pump DISABLED (Manual)");
    readSensorData();
    sendDataToServer();
  }
  lastPumpState = buttonState;
}

void readSensorData() {
  if (!dataEnabled) return;

  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  soilMoisture = map(soilMoisture, 0, 1024, 0, 100);
  soilMoisture = (soilMoisture - 100) * -1;
  pirStatus = digitalRead(PIR_PIN);
  pumpStatus = isPumpOn();

  // if (isnan(temperature) || isnan(humidity)) {
  //   Serial.println("Failed to read DHT sensor!");
  //   temperature = 0.0;
  //   humidity = 0.0;
  // }
  Serial.println(WiFi.localIP());
  Serial.println("=== SENSOR DATA ===");
  Serial.print("TEMP: "); Serial.println(temperature);
  Serial.print("HUMIDITY: "); Serial.println(humidity);
  Serial.print("SOIL MOISTURE: "); Serial.println(soilMoisture);
  Serial.print("PIR SENSOR: "); Serial.println(pirStatus);
  Serial.print("PUMP ON: "); Serial.println(isPumpOn() ? "Yes" : "No");
  Serial.println("====================");
}

bool sendDataToServer() {
  if (!dataEnabled) return false;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Attempting reconnect...");
    setup_wifi();
    return false;
  }

  StaticJsonDocument<250> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soil_moisture"] = soilMoisture;
  doc["pir"] = pirStatus;
  doc["dataEnabled"] = dataEnabled;
  // doc["pump_on"] = isPumpOn();
  doc["pump_status"] = isPumpOn();

  String payload;
  serializeJson(doc, payload);

  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(payload);

  bool success = false;
  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    Serial.println("Server response: " + response);
    success = true;
  } else {
    Serial.printf("HTTP POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return success;
}

void loop() {
  server.handleClient();
  checkPhysicalButton();
  checkPumpButton();

  unsigned long currentMillis = millis();

  if (currentMillis - previousCheckMillis >= checkInterval) {
    previousCheckMillis = currentMillis;
    readSensorData();
  }

  if (dataEnabled && currentMillis - previousSendMillis >= sendInterval) {
    previousSendMillis = currentMillis;
    sendDataToServer();
  }
  

  delay(100);
}
