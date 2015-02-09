<?php

class BigFileUtils
{
    protected $chunkSize;
    public function setBigFileChunkSize($chunkSize)
    {
        $this->chunkSize = $chunkSize;
    }

    /*
     *
     */
    public function findBetween($filename, $startTag, $endTag)
    {
        $chunkSize = FileSystemUtils::iniValueInBytes($this->chunkSize);

        $fp = @fopen($filename, 'rb');
        if (!$fp) {
            throw new BigFileException("Could not open file $filename");
        }

        $output    = null;
        $buf       = '';
        $startPos  = false;
        $endPos    = false;
        $error     = null;

        for (;;) {
            // read
            $chunk = @fread($fp, $chunkSize);

            // check for error or eof
            if (empty($chunk)) {
                if (!feof($fp))               { $error = 'Read failure'; }
                else if ($startPos !== false) { $error = 'Unterminated'; }
                else                          { $error = 'Not Found';    }
                break;
            }

            $buf .= $chunk;

            if ($startPos === false) { // haven't found start of data yet
                $startPos = strpos($buf, $startTag);
                if ($startPos !== false) {
                    $output   = substr($buf, $startPos);
                    $firstTry = true;
                    $buf = '';
                } else {
                    $buf = substr($buf, 1 - strlen($startTag));
                }
            }

            if ($startPos !== false) { // have found start of data
                $output .= $buf;
                $endPos = strpos($output, $endTag);
                if ($endPos !== false) {
                    $output = substr($output,
                                     0,
                                     $endPos + strlen($endTag));
                    break;
                } else {
                    if ($firstTry) {
                        $firstTry = false;
                        $buf = '';
                    } else {
                        $error = "Data exceeds limit of $chunkSize bytes";
                        break;
                    }
                }
            } // END if we've found start of data
        } // END each chunk

        @fclose($fp);

        if ($error) { throw new BigFileException($error); }

        return $output;
    }
}
