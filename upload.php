<?php
$array = array();

if(!empty($_POST["fileName"])) {
	$filename = $_POST["fileName"];
	$url = 'uploads/'.$filename;
	file_put_contents($url,file_get_contents($_FILES["file"]["tmp_name"]),FILE_APPEND);
    $array['success'] = true;
    echo json_encode($array);
}elseif(!empty($_GET["names"])){
	$names = $_GET["names"];
	$nameArr = explode('|', $names);
	$array['success'] = true;
	$array['results'] = array();
	foreach ($nameArr as $k => $v) {
		if(file_exists("uploads/".$v)){
			$array['results'][$v] = filesize("uploads/".$v);
		}else{
			$array['results'][$v] = false;
		}
	}
    echo json_encode($array);
}

?>