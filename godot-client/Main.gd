extends Control

# Game client main script
# This handles the main game logic and UI

@onready var title_label = $VBoxContainer/TitleLabel
@onready var status_label = $VBoxContainer/StatusLabel
@onready var connect_button = $VBoxContainer/ConnectButton

var backend_url = "http://localhost:3000"
var http_request: HTTPRequest

func _ready():
	print("Godot game client started")
	setup_ui()
	setup_http_request()
	connect_to_backend()

func setup_ui():
	title_label.text = "Monorepo Game Client"
	status_label.text = "Connecting to backend..."
	connect_button.pressed.connect(_on_connect_button_pressed)
	connect_button.text = "Reconnect"
	connect_button.disabled = true

func setup_http_request():
	http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(_on_request_completed)

func connect_to_backend():
	print("Attempting to connect to backend at: ", backend_url)
	var error = http_request.request(backend_url + "/health")
	if error != OK:
		print("Failed to make HTTP request: ", error)
		status_label.text = "Failed to connect to backend"
		connect_button.disabled = false

func _on_request_completed(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
	print("Request completed. Response code: ", response_code)
	
	if response_code == 200:
		var json = JSON.new()
		var parse_result = json.parse(body.get_string_from_utf8())
		
		if parse_result == OK:
			var response = json.data
			print("Backend response: ", response)
			status_label.text = "Connected to backend ✓"
			status_label.modulate = Color.GREEN
		else:
			print("Failed to parse JSON response")
			status_label.text = "Invalid response from backend"
			connect_button.disabled = false
	else:
		print("Backend connection failed with code: ", response_code)
		status_label.text = "Backend connection failed"
		status_label.modulate = Color.RED
		connect_button.disabled = false

func _on_connect_button_pressed():
	status_label.text = "Reconnecting..."
	status_label.modulate = Color.WHITE
	connect_button.disabled = true
	connect_to_backend()

# Handle game input
func _input(event):
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_ESCAPE:
				get_tree().quit()
			KEY_F11:
				if DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_WINDOWED:
					DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
				else:
					DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
