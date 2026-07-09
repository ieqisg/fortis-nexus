import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import MentorCompleteProfile from "@/app/mentor/complete-profile/compelete-profile"

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    createMentorProfile: vi.fn(),
    changeDefaultPassword: vi.fn(),
    getMenteeCount: vi.fn(),
    getMentorCapacityStats: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}))

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mocks.push }),
}))

vi.mock("sonner", () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}))

vi.mock("@/app/context/authContext", () => ({
    UserAuth: () => ({
        signIn: mocks.signIn,
        signOut: mocks.signOut,
        getUser: mocks.getUser,
    }),
}))

vi.mock("@//lib/actions/mentorActions", () => ({
    createMentorProfile: mocks.createMentorProfile,
    changeDefaultPassword: mocks.changeDefaultPassword,
}))

vi.mock("@//lib/actions/adminActions", () => ({
    getMenteeCount: mocks.getMenteeCount,
    getMentorCapacityStats: mocks.getMentorCapacityStats,
}))

async function fillRequiredProfileFields() {
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/First Name/i), "Ada")
    await user.type(screen.getByLabelText(/Last Name/i), "Lovelace")
    await user.type(screen.getByPlaceholderText("Search languages, frameworks, tools..."), "Python{Enter}")
    await user.type(screen.getByLabelText(/Brief Description about yourself/i), "Research mentor for computing systems.")
    await user.type(screen.getByPlaceholderText("Search algorithms, domains, research areas..."), "Machine Learning{Enter}")
    await user.type(screen.getByPlaceholderText("Change your password"), "Strong_123")
    await user.type(screen.getByPlaceholderText("Confirm your password"), "Strong_123")
    await user.click(screen.getByLabelText("Mon"))
    await user.click(await screen.findByLabelText("7:00-8:00"))

    return user
}

describe("MentorCompleteProfile DPA consent", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.signIn.mockResolvedValue({ success: true })
        mocks.signOut.mockResolvedValue({ success: true })
        mocks.getUser.mockResolvedValue({ success: true, data: { user: { id: "mentor-1" } } })
        mocks.changeDefaultPassword.mockResolvedValue({ success: true })
        mocks.createMentorProfile.mockResolvedValue({ success: true })
        mocks.getMenteeCount.mockResolvedValue({ success: true, count: 4 })
        mocks.getMentorCapacityStats.mockResolvedValue({
            success: true,
            totalMentors: 2,
            mentorsWithCapacity: 1,
            totalCapacitySet: 1,
        })
    })

    it("renders DPA content for published papers and previous mentored thesis papers", () => {
        render(<MentorCompleteProfile />)

        expect(screen.getByText("Data Privacy Agreement")).toBeInTheDocument()
        expect(screen.getAllByText(/published papers/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/previous mentored thesis paper/i).length).toBeGreaterThan(0)
        expect(screen.getByText(/mentor-mentee compatibility/i)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /AcceptI agree/i })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /RejectI do not agree/i })).toBeInTheDocument()
    })

    it("keeps profile completion disabled until DPA is accepted", async () => {
        render(<MentorCompleteProfile />)

        const user = await fillRequiredProfileFields()
        const submitButton = screen.getByRole("button", { name: "Complete Mentor Profile" })

        expect(submitButton).toBeDisabled()

        await user.click(screen.getByRole("button", { name: /RejectI do not agree/i }))

        expect(screen.getByText(/Your profile cannot be completed without this consent/i)).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
        expect(mocks.createMentorProfile).not.toHaveBeenCalled()
    })

    it("submits DPA consent when accepted", async () => {
        render(<MentorCompleteProfile />)

        const user = await fillRequiredProfileFields()
        await user.click(screen.getByRole("button", { name: /AcceptI agree/i }))

        const submitButton = screen.getByRole("button", { name: "Complete Mentor Profile" })
        expect(submitButton).toBeEnabled()

        await user.click(submitButton)

        await waitFor(() => {
            expect(mocks.createMentorProfile).toHaveBeenCalledWith(
                expect.objectContaining({
                    first_name: "Ada",
                    last_name: "Lovelace",
                    dpa_consent_accepted: true,
                })
            )
        })
        expect(mocks.changeDefaultPassword).toHaveBeenCalledWith("Strong_123")
        expect(mocks.signOut).toHaveBeenCalled()
        expect(mocks.push).toHaveBeenCalledWith("/")
    })
})
