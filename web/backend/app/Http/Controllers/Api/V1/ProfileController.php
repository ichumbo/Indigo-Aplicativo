<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'user' => $user,
            'trainerProfile' => $user->trainerProfile,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|min:3',
            'phone' => 'nullable|string',
            'avatar' => 'nullable|string',
            'crefNumber' => 'nullable|string',
            'crefState' => 'nullable|string|max:2',
            'bio' => 'nullable|string',
            'specialties' => 'nullable|array',
            'city' => 'nullable|string',
            'state' => 'nullable|string|max:2',
            'instagram' => 'nullable|string',
            'workingHours' => 'nullable|string',
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['phone'])) $user->phone = $validated['phone'];
        if (isset($validated['avatar'])) $user->avatar = $validated['avatar'];
        $user->save();

        $profile = TrainerProfile::firstOrCreate(['user_id' => $user->id], ['id' => 'profile-' . $user->id]);

        if (isset($validated['crefNumber'])) $profile->cref_number = $validated['crefNumber'];
        if (isset($validated['crefState'])) $profile->cref_state = strtoupper($validated['crefState']);
        if (isset($validated['bio'])) $profile->bio = $validated['bio'];
        if (isset($validated['specialties'])) $profile->specialties = $validated['specialties'];
        if (isset($validated['city'])) $profile->city = $validated['city'];
        if (isset($validated['state'])) $profile->state = strtoupper($validated['state']);
        if (isset($validated['instagram'])) $profile->instagram = $validated['instagram'];
        if (isset($validated['workingHours'])) $profile->working_hours = $validated['workingHours'];
        $profile->save();

        return response()->json([
            'message' => 'Perfil profissional atualizado com sucesso.',
            'user' => $user->fresh('trainerProfile'),
        ]);
    }
}
