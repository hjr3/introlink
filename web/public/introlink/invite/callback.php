<?php

require __DIR__ . '/config.php';

session_start();
$request_token = $_SESSION['request_token'];

$oauth = new OAuth(CONSUMER_KEY, CONSUMER_SECRET);
$oauth->setToken($request_token['oauth_token'], $request_token['oauth_token_secret']);

$oauth_verifier = $_REQUEST['oauth_verifier'];
$access_token_url = 'https://api.linkedin.com/uas/oauth/accessToken';
$access_token_response = $oauth->getAccessToken($access_token_url, "", $oauth_verifier);

if($access_token_response === FALSE) {
	throw new Exception("Failed fetching request token, response was: " . $oauth->getLastResponse());
} else {
	$access_token = $access_token_response;
}

$_SESSION['access_token'] = $access_token;

header("Location: /introlink/invite/");
