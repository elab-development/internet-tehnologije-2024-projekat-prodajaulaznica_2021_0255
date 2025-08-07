<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * @OA\Tag(
     *     name="Authentication",
     *     description="Operations related to user authentication"
     * )
     */
    /**
     * @OA\Post(
     *     path="/register",
     *     summary="Register a new user",
     *     tags={"Authentication"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name","email","password"},
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="email", type="string"),
     *             @OA\Property(property="password", type="string")
     *         )
     *     ),
     *     @OA\Response(response=201, description="User registered successfully")
     * )
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|min:8',
        ]);
        

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /**
     * @OA\Post(
     *     path="/login",
     *     summary="Login user",
     *     tags={"Authentication"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email","password"},
     *             @OA\Property(property="email", type="string"),
     *             @OA\Property(property="password", type="string")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Login successful"),
     *     @OA\Response(response=401, description="Unauthorized")
     * )
     */
    public function login(Request $request)
{
    $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if (!Auth::attempt($request->only('email', 'password'))) {
        return response()->json([
            'message' => 'Login failed, credentials are wrong!'
        ], 401);
    }

    $user = User::where('email', $request->email)->firstOrFail();
    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Login successful',
        'user' => $user,
        'access_token' => $token,
        'token_type' => 'Bearer',
        'frontend_url' => $this->getRedirectUrl(),
    ]);
}
/**
     * @OA\Post(
     *     path="/logout",
     *     summary="Logout user",
     *     tags={"Authentication"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Logged out successfully")
     * )
     */
public function logout(Request $request)
{
    try {
        // Delete current access token
        $request->user()->currentAccessToken()->delete();
        
        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Logout failed'
        ], 500);
    }
}

    /**
     * @OA\Get(
     *     path="/csrf-token",
     *     summary="Get CSRF token",
     *     tags={"Authentication"},
     *     @OA\Response(response=200, description="CSRF cookie set")
     * )
     */
    public function csrf()
    {
        return response()->json(['message' => 'CSRF cookie set']);
    }

    protected function getRedirectUrl()
    {
        return config('frontend.url');
    }
/**
     * @OA\Post(
     * path="/api/refresh-token",
     * summary="Refreshes the user's access token",
     * tags={"Auth"},
     * security={{"bearerAuth":{}}},
     * @OA\Response(
     * response=200,
     * description="Token refreshed successfully",
     * @OA\JsonContent(
     * @OA\Property(property="message", type="string", example="Token refreshed successfully"),
     * @OA\Property(property="user", type="object",
     * @OA\Property(property="id", type="integer", example=1),
     * @OA\Property(property="name", type="string", example="John Doe"),
     * @OA\Property(property="email", type="string", example="john.doe@example.com")
     * ),
     * @OA\Property(property="access_token", type="string", example="1|12345abcdefg..."),
     * @OA\Property(property="token_type", type="string", example="Bearer")
     * )
     * ),
     * @OA\Response(
     * response=401,
     * description="Unauthorized",
     * @OA\JsonContent(
     * @OA\Property(property="message", type="string", example="Token refresh failed")
     * )
     * )
     * )
     */
    public function refresh(Request $request)
    {
        try {
            $user = $request->user();
            
            // Delete current token
            $request->user()->currentAccessToken()->delete();
            
            // Create new token
            $newToken = $user->createToken('auth_token')->plainTextToken;
            
            return response()->json([
                'message' => 'Token refreshed successfully',
                'user' => $user,
                'access_token' => $newToken,
                'token_type' => 'Bearer',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Token refresh failed'
            ], 401);
        }
    }
/**
     * @OA\Get(
     * path="/api/user",
     * summary="Get the authenticated user's details",
     * tags={"Auth"},
     * security={{"bearerAuth":{}}},
     * @OA\Response(
     * response=200,
     * description="User data retrieved successfully",
     * @OA\JsonContent(
     * @OA\Property(property="message", type="string", example="User data retrieved successfully"),
     * @OA\Property(property="user", type="object",
     * @OA\Property(property="id", type="integer", example=1),
     * @OA\Property(property="name", type="string", example="John Doe"),
     * @OA\Property(property="email", type="string", example="john.doe@example.com")
     * )
     * )
     * ),
     * @OA\Response(
     * response=401,
     * description="Unauthorized",
     * @OA\JsonContent(
     * @OA\Property(property="message", type="string", example="Unauthenticated.")
     * )
     * )
     * )
     */
    public function user(Request $request)
    {
        return response()->json([
            'message' => 'User data retrieved successfully',
            'user' => $request->user()
        ]);
    }
}
