<?php

$routes = array (

    '/files/(quick-add)\.(json|xml)/?' =>
        array (
            'action' => 'files-$1',
            'action_datasource' => 'node-$1',
            'action_form_view' => 'node/$1.cft',
            'action_success_view' => 'node/$1.cft',
            'view_handler' => '$2',
            'b_save' => true
        ),

    '/media/(get|find-all|quick-add|replace-thumbnail|add-thumbnail|remove-thumbnail|upload-archive)\.(json)/?' =>
        array (
            'action' => 'media-$1',
            'action_datasource' => 'node-$1',
            'action_form_view' => 'node/$1.cft',
            'action_success_view' => 'node/$1.cft',
            'view_handler' => '$2',
            'b_save' => true
        ),

);
