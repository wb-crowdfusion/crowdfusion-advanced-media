<?php

/**
 * AdvancedmediamigrationCliController
 *
 * PHP version 5
 *
 * Crowd Fusion
 * Copyright (C) 2009-2011 Crowd Fusion, Inc.
 * http://www.crowdfusion.com/
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * @package     CrowdFusion
 * @copyright   2009-2011 Crowd Fusion Inc.
 * @license     http://www.crowdfusion.com/licenses/enterprise CF Enterprise License
 * @version     $Id$
 */
class AdvancedmediamigrationCliController extends NodeCliController
{
    /**********************************************************************
     * inject dependencies
    /**********************************************************************/
    protected $ApplicationContext;
    public function setApplicationContext(ApplicationContext $ApplicationContext)
    {
        $this->ApplicationContext = $ApplicationContext;
    }

    /**********************************************************************
     * inject config properties
    /**********************************************************************/

    /**********************************************************************
     * methods
    /**********************************************************************/
    protected function preMigratePrimaryImage()
    {
        $elements = $this->ElementService->findAllWithAspect('@mixin-primary-image');
        foreach ($elements as $element) {
            if ($element->hasAspect('@mixin-migrate-from-primary-media')) {
                continue;
            }
            echo "Applying @mixin-migrate-from-primary-media to [{$element->Slug}]\n";
            $aspect = $this->AspectService->getBySlug('mixin-migrate-from-primary-media');
            $element->addAspect($aspect);
            $this->ElementService->edit($element);
        }

        echo "Done.\n";
    }

    protected function migratePrimaryImage()
    {
        $elements = $this->ElementService->findAllWithAspect('@mixin-primary-image');
        $this->TransactionManager->commit();

        $step = 200;
        foreach ($elements as $element) {
            echo "Migrate element [{$element->Slug}]\n";

            for (;;) {
                $q = new NodeQuery();
                $q->setParameter('Elements.in',   $element->Slug)
                  ->setParameter('OutTags.exist',  '#primary-media')
                  ->setParameter('OutTags.select', '#primary-media')
                  ->setLimit($step)
                ;

                $q = $this->NodeService->findAll($q);
                if (!$q->hasResults()) {
                    echo "No more results\n";
                    break;
                }

                $this->TransactionManager->begin();
                foreach ($q->getResults() as $node) {
                    $mediaNode = $node->getOutTag('#primary-media')->TagLinkNode;
                    $node->removeOutTags('#primary-media');

                    if (!$mediaNode->Element->hasAspect('@images')) {
                        echo "Linked node does not have @images.\n";
                        continue;
                    } else {
                        $node->addOutTag(new Tag($mediaNode->NodeRef,
                                                 null,
                                                 '#primary-image'));
                    }

                    echo "Updating node [{$node->NodeRef}]\n";
                    $this->NodeService->edit($node);
                }

                $this->TransactionManager->commit();
            }
        }

        echo "Done.\n";
    }

    protected function postMigratePrimaryImage()
    {
        // this doesn't actually work
        $elements = $this->ElementService->findAllWithAspect('@mixin-primary-image');

        foreach ($elements as $element) {
            echo "Removing @mixin-migrate-from-primary-media to [{$element->Slug}]\n";
            $aspects = $element->Aspects;
            $aspectsToKeep = array();
            $found = false;
            foreach ($aspects as $aspect) {
                if ($aspect->Name != 'mixin-migrate-from-primary-media') {
                    $aspectsToKeep[] = $aspect;
                } else {
                    $found = true;
                }
            }
            if ($found) {
                echo "Removing @mixin-migrate-from-primary-media to [{$element->Slug}]\n";
                $element->setAspects($aspectsToKeep);
                $this->ElementService->edit($element);
            }
        }
        "Done.\n";
    }
}
