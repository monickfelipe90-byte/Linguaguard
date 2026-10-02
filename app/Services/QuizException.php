<?php

namespace App\Services;

use RuntimeException;

/**
 * A quiz rule was violated. The message is safe to show to learners.
 */
class QuizException extends RuntimeException
{
}
