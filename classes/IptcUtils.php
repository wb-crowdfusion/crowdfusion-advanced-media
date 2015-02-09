<?php

class IptcUtils
{
    /*
     *
     */
    public static function translateKeys($iptc)
    {
        /*
         * There are many fields, these are just the ones we need.
         * The full spec is available at
         * http://www.iptc.org/std/IIM/4.1/specification/IIMV4.1.pdf
         * (see section 6).
         * A nice consice list of fields can be found at
         * http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/IPTC.html
         */
        $map = array(
            '2#005' => 'ObjectName',
            '2#025' => 'Keywords',
            '2#030' => 'ReleaseDate',
            '2#055' => 'DateCreated',
            '2#080' => 'By-line',
            '2#105' => 'Headline',
            '2#110' => 'Credit',
            '2#115' => 'Source',
            '2#116' => 'CopyrightNotice',
            '2#120' => 'Caption-Abstract'
        );

        $out = array();

        foreach ($map as $k => $tr) {
            if (isset($iptc[$k]) && is_array($iptc[$k]) && !empty($iptc[$k])) {
                $out[$tr] = $iptc[$k][0];
            } else {
                $out[$tr] = null;
            }
        }

        return $out;
    }

    /*
     *
     */
    public static function parseImage($filename)
    {
        if(@getimagesize($filename, $data) && isset($data['APP13']))
            return self::translateKeys(iptcparse($data['APP13']));

        return null;
    }
}
