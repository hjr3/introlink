<?php
require __DIR__ . '/config.php';

session_start();

if (isset($_GET['email'])) {
	$_SESSION['email'] = $_GET['email'];
}

$oauth = new OAuth(CONSUMER_KEY, CONSUMER_SECRET);

if (!isset($_SESSION['access_token'])) {

	$callback = "http://dev.hermanradtke.com/introlink/invite/callback.php";
	$request_token_response = $oauth->getRequestToken('https://api.linkedin.com/uas/oauth/requestToken', $callback);

	if($request_token_response === FALSE) {
		throw new Exception("Failed fetching request token, response was: " . $oauth->getLastResponse());
	} else {
		$request_token = $request_token_response;
	}

	$_SESSION['request_token'] = $request_token;

	$token = $request_token['oauth_token'];
	$auth_url = "https://api.linkedin.com/uas/oauth/authorize?oauth_token={$token}";

	header("Location: {$auth_url}");
	exit;
}

$access_token = $_SESSION['access_token'];

$token = $access_token['oauth_token'];
$secret = $access_token['oauth_token_secret'];

$oauth->setToken($token, $secret);

$sendInvite = function ($email, $first_name, $last_name) use ($oauth) {

	$url = "http://api.linkedin.com/v1/people/~/mailbox";
	$body = <<<EOT
<?xml version='1.0' encoding='UTF-8'?>
<mailbox-item>
  <recipients>
	<recipient>
	  <person path="/people/email={$email}">
		<first-name>{$first_name}</first-name>
		<last-name>{$last_name}</last-name>
	  </person>
	</recipient>
  </recipients>
  <subject>Invitation to Connect</subject>
  <body>Please join my professional network on LinkedIn.</body>
  <item-content>
	<invitation-request>
	  <connect-type>friend</connect-type>
	</invitation-request>
  </item-content>
</mailbox-item>
EOT;

	try {
		$oauth->fetch($url, $body, OAUTH_HTTP_METHOD_POST, array('Content-Type' => 'text/xml'));
	} catch (Exception $e) {
	}

	$response = $oauth->getLastResponse();

	if (is_null($response)) {
		return true;
	}

	libxml_use_internal_errors();
	$result = new SimpleXmlElement($response);

	$errors = libxml_get_errors();

	if ($errors) {
		// log these
		return false;
	}

	if ($result->status === 200) {
		return true;
	}
		
	return false;
};

if (!isset($_SESSION['email'])) {
	print 'no email address found';
	exit;
}

$email = $_SESSION['email'];

$pattern = "/([a-z0-9!#$%&'\*+\-\/=?\^_`\{\|\}~\.]+@(?:[a-z0-9\-]+)(?:\.[a-z0-9\-]+)+)/i";
$parts = preg_split($pattern, $email, 0, PREG_SPLIT_DELIM_CAPTURE);

$email_address = $parts[1];

if (!filter_var($email_address, FILTER_VALIDATE_EMAIL)) {
	echo 'bad email address format';
	exit;
}

$name = $parts[0];
$first_name = '';
$last_name = '';

if ($name) {
	$name = preg_replace('/[^a-zA-Z0-9\s]/', '', $name);
	$name = trim($name);
	$names = explode(' ', $name);

	$first_name = $names[0];
	$last_name = end($names);
}

$to = $email;

if ($first_name) {
	$to = $first_name;

	if ($last_name) {
		$to = "{$to} {$last_name}";
	}
}

if ($sendInvite($email_address, $first_name, $last_name)) {
	print "Your LinkedIn invite to {$to} has been sent!";
} else {
	print "Unable to send LinkedIn invite to {$to}.";
}

unset($_SESSION['email']);
