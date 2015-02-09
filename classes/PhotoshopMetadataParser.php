<?php

class PhotoshopMetadataParser
{
    protected $BigFileUtils;
    public function setBigFileUtils(BigFileUtils $BigFileUtils)
    {
        $this->BigFileUtils = $BigFileUtils;
    }

    protected $SimpleXMLParser;
    public function setSimpleXMLParser(SimpleXMLParserInterface $SimpleXMLParser)
    {
        $this->SimpleXMLParser = $SimpleXMLParser;
    }


    /*
     *
     */
    public function parseFile($filename)
    {
        try {
            $xmpString = $this->BigFileUtils->findBetween($filename,
                                                          '<x:xmpmeta',
                                                          '</x:xmpmeta>');
        } catch (BigFileException $e) {
            return null;
        }

        // The xml has namesapces defined at the same level as they're used.
        // Such xml won't parse.  Move the namespace definitions we care
        // about to the top level node
        $namespaceAttributes = '';
        if (
            preg_match_all('/xmlns:(\w+)="[^"]+"/',
                           $xmpString,
                           $matches,
                           PREG_SET_ORDER)
        ) {
            foreach ($matches as $match) {
                list($attribute, $namespace) = $match;
                if (in_array($namespace, array('dc', 'rdf'))) {
                    $namespaceAttributes .= " $attribute";
                }
            }
            $xmpString = preg_replace('/ xmlns:\w+="[^"]+"/', '', $xmpString);
        }

        $xmlString = '<?xml version="1.0" encoding="UTF-8"?>'
                   . "<root$namespaceAttributes>$xmpString</root>";

        try {
            $xml = $this->SimpleXMLParser->parseXmlString($xmlString);
        } catch (Exception $e) {
            return null;
        }


        $fields = array( // only creator field for now
            'creator' => '//rdf:RDF/rdf:Description/dc:creator/rdf:Seq/rdf:li'
        );

        $output = array();
        foreach ($fields as $field => $xpath) {
            $xmlNode = $xml->xpathOne($xpath);
            if ($xmlNode) {
                $output[$field] = (string)$xmlNode;
            } else {
                $output[$field] = null;
            }
        }

        return $output;
    }
}
